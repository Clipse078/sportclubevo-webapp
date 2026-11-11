/**
 * SCE-DS2-07G — create local verification database, migrate, and catalog seed.
 *
 * Never targets STAGE/Neon runtime. Requires local Postgres admin access via
 * DATABASE_URL_VERIFICATION_BOOTSTRAP (defaults to postgres database on localhost).
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  SCE_DS2_07G_VERIFICATION_DATABASE_NAME,
  SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION,
} from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";
import {
  assertSafeVerificationDatabase,
  fingerprintVerificationDatabase,
} from "@/lib/test/safe-verification-database";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

async function ensureDatabaseExists(adminUrl: string, databaseName: string): Promise<void> {
  const pool = new Pool({ connectionString: adminUrl });
  const client = await pool.connect();
  try {
    const exists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [databaseName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${databaseName}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const bootstrapUrl =
    process.env.DATABASE_URL_VERIFICATION_BOOTSTRAP?.trim() ||
    "postgresql://fca:fca_dev@127.0.0.1:5432/postgres";

  const verificationUrl = `postgresql://fca:fca_dev@127.0.0.1:5432/${SCE_DS2_07G_VERIFICATION_DATABASE_NAME}`;

  await ensureDatabaseExists(bootstrapUrl, SCE_DS2_07G_VERIFICATION_DATABASE_NAME);

  process.env.DATABASE_URL_VERIFICATION = verificationUrl;
  const safeUrl = assertSafeVerificationDatabase(verificationUrl);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: safeUrl,
      DIRECT_URL: safeUrl,
      SCE_OPERATION_AUTHORIZATION: SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION,
    },
  });

  execSync("npm run db:seed", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: safeUrl,
      DIRECT_URL: safeUrl,
      SCE_OPERATION_AUTHORIZATION: SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION,
    },
  });

  const pool = new Pool({ connectionString: safeUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const permissionCount = await prisma.permission.count();
  await prisma.$disconnect();
  await pool.end();

  console.log(
    JSON.stringify(
      {
        status: "provisioned",
        databaseFingerprint: fingerprintVerificationDatabase(safeUrl),
        databaseUrlMasked: maskDatabaseUrl(safeUrl),
        permissionCatalogRows: permissionCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[sce-ds2-07g-provision-verification-database] failed", error);
  process.exit(1);
});
