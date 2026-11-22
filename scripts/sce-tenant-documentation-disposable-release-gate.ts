/**
 * PR #1025 — disposable Postgres release gate: migrate deploy + integration vitest.
 */
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";

import { buildDisposablePrismaMigrateProcessEnv } from "@/lib/test/safe-disposable-migration-env";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";
import {
  SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER,
} from "@/lib/tenant-documentation/sce-tenant-documentation-migration-handoff";

function databaseUrlWithDb(baseUrl: string, dbName: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

function ensureLocalDatabase(adminUrl: string, dbName: string): void {
  const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, "");
  const psqlArgs = [
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${safeName}' AND pid <> pg_backend_pid();`,
    "-c",
    `DROP DATABASE IF EXISTS "${safeName}";`,
    "-c",
    `CREATE DATABASE "${safeName}";`,
  ];
  const viaUrl = spawnSync("psql", [adminUrl, ...psqlArgs], { encoding: "utf8" });
  if (viaUrl.status !== 0) {
    throw new Error(viaUrl.stderr || `Could not create disposable database ${safeName}`);
  }
}

async function main(): Promise<void> {
  const bootstrap =
    process.env.DATABASE_URL_VERIFICATION_BOOTSTRAP?.trim() ||
    "postgresql://fca:fca_dev@127.0.0.1:5432/postgres";
  const dbName = `sce_tenant_doc_rg_${crypto.randomBytes(4).toString("hex")}`;
  const disposableUrl = databaseUrlWithDb(
    process.env.TEST_DATABASE_URL?.trim() ||
      "postgresql://fca:fca_dev@127.0.0.1:5432/postgres",
    dbName,
  );

  ensureLocalDatabase(bootstrap, dbName);

  const migrateEnv = buildDisposablePrismaMigrateProcessEnv(process.env, disposableUrl);
  migrateEnv.SCE_OPERATION_AUTHORIZATION = "sce-tenant-documentation-disposable-release-gate";
  migrateEnv.TEST_DATABASE_URL = disposableUrl;
  migrateEnv.DATABASE_URL = disposableUrl;
  migrateEnv.DIRECT_URL = disposableUrl;

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: migrateEnv });
  execSync("npx prisma generate", { stdio: "inherit", env: migrateEnv });
  execSync("npm run db:seed", { stdio: "inherit", env: migrateEnv });
  migrateEnv.APPLY_PERMISSION_SYNC = "true";
  execSync("npx tsx scripts/sync-tenant-documentation-permissions.ts", {
    stdio: "inherit",
    env: migrateEnv,
  });

  execSync(
    `npx vitest run lib/tenant-documentation/__tests__/collaboration-sync.integration.test.ts lib/tenant-documentation/__tests__/publish-persistence.integration.test.ts lib/tenant-documentation/__tests__/page-lifecycle.integration.test.ts lib/tenant-documentation/__tests__/version-history.integration.test.ts`,
    { stdio: "inherit", env: migrateEnv },
  );

  execSync("npm run tenant-documentation:disposable-migration-verify", {
    stdio: "inherit",
    env: migrateEnv,
  });

  if (process.env.TENANT_DOC_BROWSER_REGRESSION === "1") {
    const authSecret =
      process.env.AUTH_SECRET?.trim() ||
      process.env.NEXTAUTH_SECRET?.trim() ||
      migrateEnv.AUTH_SECRET?.trim() ||
      migrateEnv.NEXTAUTH_SECRET?.trim();
    if (!authSecret) {
      throw new Error(
        "AUTH_SECRET or NEXTAUTH_SECRET required for browser regression (set in .env or shell)",
      );
    }
    migrateEnv.AUTH_SECRET = authSecret;
    migrateEnv.NEXTAUTH_SECRET = authSecret;

    migrateEnv.TENANT_DOC_BROWSER_SKIP_BUILD = "1";
    execSync("npm run build", { stdio: "inherit", env: migrateEnv });
    execSync("npm run tenant-documentation:edit-browser-regression", {
      stdio: "inherit",
      env: migrateEnv,
    });
    migrateEnv.TENANT_DOC_BROWSER_PORT = "3098";
    execSync("npm run tenant-documentation:lifecycle-browser-regression", {
      stdio: "inherit",
      env: migrateEnv,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        disposableTarget: maskDatabaseUrl(disposableUrl),
        migrations: SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER,
        integrationTests: [
          "lib/tenant-documentation/__tests__/collaboration-sync.integration.test.ts",
          "lib/tenant-documentation/__tests__/publish-persistence.integration.test.ts",
          "lib/tenant-documentation/__tests__/page-lifecycle.integration.test.ts",
          "lib/tenant-documentation/__tests__/version-history.integration.test.ts",
        ],
        note: "Executed on guarded disposable Postgres; shared STAGE not mutated.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[sce-tenant-documentation-disposable-release-gate] FAILED:", error);
  process.exit(1);
});