/**
 * SCE-DEPLOY-01 — application build must not invoke prisma migrate deploy.
 * Controlled migrations use db:migrate:deploy-if-enabled with APPLY_DATABASE_MIGRATIONS=true.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldApplyDatabaseMigrations } from "@/lib/server/database-migration-policy";
import {
  evaluateOperationalMutationGuard,
  type OperationalMutationGuardInput,
} from "@/lib/server/operational-database-guard";

const REMOTE_DATABASE_URL =
  "postgresql://user:password@remote-database.example:5432/sce";

function readPackageScripts(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  return pkg.scripts;
}

describe("build / migration deployment decoupling", () => {
  it("npm run build does not invoke db:migrate:deploy-if-enabled or migrate deploy", () => {
    const scripts = readPackageScripts();
    expect(scripts.build).not.toContain("db:migrate:deploy-if-enabled");
    expect(scripts.build).not.toContain("migrate deploy");
    expect(scripts.build).toContain("prisma generate");
  });

  it("explicit guarded migration entrypoint remains available", () => {
    const scripts = readPackageScripts();
    expect(scripts["db:migrate:deploy-if-enabled"]).toContain(
      "deploy-migrations-if-enabled",
    );
    expect(scripts["db:migrate:deploy"]).toContain("migrate deploy");
  });

  it("APPLY_DATABASE_MIGRATIONS=false does not enable migrations", () => {
    expect(
      shouldApplyDatabaseMigrations({ APPLY_DATABASE_MIGRATIONS: "false" }),
    ).toBe(false);
  });

  it("unset APPLY_DATABASE_MIGRATIONS defaults to skip (safe)", () => {
    expect(shouldApplyDatabaseMigrations({})).toBe(false);
    expect(shouldApplyDatabaseMigrations({ NODE_ENV: "production" })).toBe(
      false,
    );
  });

  it("Preview cannot authorize deploy-migrations even when flag is true", () => {
    const input: OperationalMutationGuardInput = {
      operationId: "deploy-migrations",
      databaseUrl: REMOTE_DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["acceptance", "stage", "prod"],
      operationSpecificAuthorization: true,
    };
    const result = evaluateOperationalMutationGuard(input, {
      NODE_ENV: "production",
      APP_ENV: "preview",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      APPLY_DATABASE_MIGRATIONS: "true",
      DATABASE_URL: REMOTE_DATABASE_URL,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("not authorized for persistent mutation");
    }
  });

  it("Production deploy-migrations requires independent SCE_PRODUCTION_MUTATION_APPROVAL", () => {
    const input: OperationalMutationGuardInput = {
      operationId: "deploy-migrations",
      databaseUrl: REMOTE_DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["acceptance", "stage", "prod"],
      operationSpecificAuthorization: true,
    };
    const withoutApproval = evaluateOperationalMutationGuard(input, {
      NODE_ENV: "production",
      APP_ENV: "prod",
      VERCEL: "1",
      VERCEL_ENV: "production",
      APPLY_DATABASE_MIGRATIONS: "true",
      DATABASE_URL: REMOTE_DATABASE_URL,
    });
    expect(withoutApproval.allowed).toBe(false);

    const withApproval = evaluateOperationalMutationGuard(input, {
      NODE_ENV: "production",
      APP_ENV: "prod",
      VERCEL: "1",
      VERCEL_ENV: "production",
      APPLY_DATABASE_MIGRATIONS: "true",
      SCE_PRODUCTION_MUTATION_APPROVAL: "deploy-migrations:prod",
      DATABASE_URL: REMOTE_DATABASE_URL,
    });
    expect(withApproval.allowed).toBe(true);
  });
});
