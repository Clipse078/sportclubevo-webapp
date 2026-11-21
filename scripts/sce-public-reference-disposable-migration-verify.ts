/**
 * PR #1021 — disposable Postgres migration proof (never STAGE / production).
 *
 *   TEST_DATABASE_URL=postgresql://localhost/sce_public_ref_fresh \
 *     npm run sce-public-reference:disposable-migration-verify
 */
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { ClubMeldungCategory, ClubMeldungStatus, ClubStrategyScopeType, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import {
  SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
  SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION,
  SCE_PUBLIC_REFERENCE_MIGRATION_ORDER,
} from "@/lib/club-development/sce-public-reference-migration-handoff";
import { allocateScePublicNumber } from "@/lib/club-development/sce-public-reference";
import { runScePublicReferenceBackfill } from "@/lib/club-development/sce-public-reference-backfill";
import {
  buildDisposablePrismaMigrateProcessEnv,
  collectPrismaMigrationEndpointReport,
} from "@/lib/test/safe-disposable-migration-env";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

const GLOBAL_DIR = path.join(
  process.cwd(),
  `prisma/migrations/${SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[1]}`,
);
const BIGINT_DIR = path.join(
  process.cwd(),
  `prisma/migrations/${SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[2]}`,
);
const HOLD_ROOT = path.join("/tmp", "sce-public-reference-migration-hold");
const GLOBAL_HOLD_DIR = path.join(HOLD_ROOT, SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[1]);
const BIGINT_HOLD_DIR = path.join(HOLD_ROOT, SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[2]);

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

function databaseUrlWithDb(baseUrl: string, dbName: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

function ensureLocalDatabase(adminUrl: string, dbName: string): void {
  const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, "");
  const adminSocketUrl = (() => {
    try {
      const parsed = new URL(adminUrl);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        parsed.username = "";
        parsed.password = "";
        parsed.hostname = "";
        parsed.pathname = "/postgres";
        return `postgresql://${parsed.pathname}`;
      }
    } catch {
      /* fall through */
    }
    return adminUrl;
  })();

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
  const viaPostgres = spawnSync("sudo", ["-u", "postgres", "psql", ...psqlArgs], {
    encoding: "utf8",
  });
  if (viaPostgres.status === 0) return;

  const viaUrl = spawnSync("psql", [adminSocketUrl, ...psqlArgs], {
    encoding: "utf8",
  });
  if (viaUrl.status !== 0) {
    throw new Error(
      `Could not create disposable database ${safeName}: ${viaPostgres.stderr || viaUrl.stderr || "unknown error"}`,
    );
  }
}

function migrateDeploy(env: NodeJS.ProcessEnv): void {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
}

function holdFollowUpMigrations(): void {
  fs.mkdirSync(HOLD_ROOT, { recursive: true });
  if (fs.existsSync(GLOBAL_DIR)) {
    fs.rmSync(GLOBAL_HOLD_DIR, { recursive: true, force: true });
    fs.renameSync(GLOBAL_DIR, GLOBAL_HOLD_DIR);
  }
  if (fs.existsSync(BIGINT_DIR)) {
    fs.rmSync(BIGINT_HOLD_DIR, { recursive: true, force: true });
    fs.renameSync(BIGINT_DIR, BIGINT_HOLD_DIR);
  }
}

function restoreFollowUpMigrations(): void {
  if (fs.existsSync(GLOBAL_HOLD_DIR)) {
    fs.rmSync(GLOBAL_DIR, { recursive: true, force: true });
    fs.renameSync(GLOBAL_HOLD_DIR, GLOBAL_DIR);
  }
  if (fs.existsSync(BIGINT_HOLD_DIR)) {
    fs.rmSync(BIGINT_DIR, { recursive: true, force: true });
    fs.renameSync(BIGINT_HOLD_DIR, BIGINT_DIR);
  }
}

async function loadMigrationRows(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    return await prisma.$queryRaw<
      Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
    >`
      SELECT migration_name, checksum, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name IN (
        ${SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[0]},
        ${SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[1]},
        ${SCE_PUBLIC_REFERENCE_MIGRATION_ORDER[2]}
      )
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function seedUpgradeFixtures(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const run = `upg-${Date.now()}`;
  try {
    const tenantA = await prisma.tenant.create({
      data: { key: `ta-${run}`, name: "Tenant A", timezone: "Europe/Zurich" },
    });
    await prisma.tenant.create({
      data: { key: `tb-${run}`, name: "Tenant B", timezone: "Europe/Zurich" },
    });
    const userA = await prisma.user.create({
      data: {
        email: `a-${run}@fixture.local`,
        passwordHash: "x",
        firstName: "A",
        lastName: "User",
        tenantId: tenantA.id,
      },
    });

    await prisma.$executeRaw`
      INSERT INTO "TenantScePublicNumberSequence" ("tenantId", "nextNumber")
      VALUES (${tenantA.id}, 4)
    `;

    const strategyId = `strategy-${run}`;
    const targetBId = `target-b-${run}`;
    const taskEmptyId = `task-empty-${run}`;
    const meldungId = `meldung-${run}`;
    const meldungCaseNumber = `M-${run}-CASE`;

    await prisma.$executeRaw`
      INSERT INTO "ClubStrategy" ("id", "tenantId", "scePublicNumber", "scopeType", "title", "contentRevision", "createdAt", "updatedAt")
      VALUES (${strategyId}, ${tenantA.id}, 1, ${ClubStrategyScopeType.CLUB}::"ClubStrategyScopeType", ${`Strategy ${run}`}, 1, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "Target" ("id", "tenantId", "scePublicNumber", "title", "createdAt", "updatedAt")
      VALUES (${targetBId}, ${tenantA.id}, 3, ${`Target ${run}`}, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "Task" ("id", "tenantId", "title", "createdAt", "updatedAt")
      VALUES (${taskEmptyId}, ${tenantA.id}, ${`Unnumbered task ${run}`}, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "ClubMeldung" (
        "id", "tenantId", "scePublicNumber", "caseNumber", "subject", "description", "category", "reporterUserId", "status", "createdAt", "updatedAt"
      )
      VALUES (
        ${meldungId}, ${tenantA.id}, 2, ${meldungCaseNumber}, ${`Meldung ${run}`}, 'fixture',
        ${ClubMeldungCategory.DAMAGE_OR_PROBLEM}::"ClubMeldungCategory", ${userA.id},
        ${ClubMeldungStatus.RECEIVED}::"ClubMeldungStatus", NOW(), NOW()
      )
    `;

    return {
      tenantAId: tenantA.id,
      targetBId,
      taskEmptyId,
      meldungId,
      meldungCaseNumber,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function seedCollisionFixture(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const run = `col-${Date.now()}`;
  try {
    const tenantA = await prisma.tenant.create({
      data: { key: `ca-${run}`, name: "Tenant A", timezone: "Europe/Zurich" },
    });
    const tenantB = await prisma.tenant.create({
      data: { key: `cb-${run}`, name: "Tenant B", timezone: "Europe/Zurich" },
    });
    await prisma.$executeRaw`
      INSERT INTO "TenantScePublicNumberSequence" ("tenantId", "nextNumber")
      VALUES (${tenantA.id}, 3), (${tenantB.id}, 3)
    `;
    await prisma.$executeRaw`
      INSERT INTO "Target" ("id", "tenantId", "scePublicNumber", "title", "createdAt", "updatedAt")
      VALUES (${`ta-${run}`}, ${tenantA.id}, 7, ${`A ${run}`}, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "Target" ("id", "tenantId", "scePublicNumber", "title", "createdAt", "updatedAt")
      VALUES (${`tb-${run}`}, ${tenantB.id}, 7, ${`B ${run}`}, NOW(), NOW())
    `;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function verifyPostUpgrade(connectionString: string, fixture: Awaited<ReturnType<typeof seedUpgradeFixtures>>) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const ledgerCount = await prisma.scePublicNumberLedger.count();
    const seq = await prisma.scePublicNumberSequence.findUnique({
      where: { id: "global" },
      select: { nextNumber: true },
    });
    const targetB = await prisma.target.findUnique({
      where: { id: fixture.targetBId },
      select: { scePublicNumber: true },
    });
    const meldung = await prisma.clubMeldung.findUnique({
      where: { id: fixture.meldungId },
      select: { id: true, caseNumber: true, scePublicNumber: true },
    });
    const next = await prisma.$transaction(async (tx) => allocateScePublicNumber(tx));
    const backfillDry = await runScePublicReferenceBackfill(prisma, { dryRun: true });
    return {
      ledgerCount,
      globalNextNumber: seq?.nextNumber?.toString() ?? null,
      targetBSceNumber: targetB?.scePublicNumber?.toString() ?? null,
      meldungId: meldung?.id ?? null,
      meldungCaseNumber: meldung?.caseNumber ?? null,
      meldungSceNumber: meldung?.scePublicNumber?.toString() ?? null,
      postUpgradeAllocation: next.toString(),
      backfillDryRunAssigned: backfillDry.assigned,
      backfillDryRunCollisions: backfillDry.collisions.length,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const baseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("TEST_DATABASE_URL is required.");
  }

  const freshDb = "sce_public_ref_fresh";
  const upgradeDb = "sce_public_ref_upgrade";
  const collisionDb = "sce_public_ref_collision";

  const freshUrl = databaseUrlWithDb(baseUrl, freshDb);
  const upgradeUrl = databaseUrlWithDb(baseUrl, upgradeDb);
  const collisionUrl = databaseUrlWithDb(baseUrl, collisionDb);

  ensureLocalDatabase(baseUrl, freshDb);
  ensureLocalDatabase(baseUrl, upgradeDb);
  ensureLocalDatabase(baseUrl, collisionDb);

  const endpointsBefore = collectPrismaMigrationEndpointReport(process.env);

  // --- Fresh replay ---
  const freshEnv = buildDisposablePrismaMigrateProcessEnv(
    {
      ...process.env,
      TEST_DATABASE_URL: freshUrl,
      DATABASE_URL: freshUrl,
      DIRECT_URL: freshUrl,
    },
    freshUrl,
  );
  migrateDeploy(freshEnv);
  const freshRows = await loadMigrationRows(freshUrl);

  // --- Upgrade path (tenant foundation recorded, then global + bigint) ---
  holdFollowUpMigrations();
  let upgradeFixture: Awaited<ReturnType<typeof seedUpgradeFixtures>> | null = null;
  let upgradeDeployOk = false;
  let collisionBlocked = false;
  try {
    const upgradePartialEnv = buildDisposablePrismaMigrateProcessEnv(
      {
        ...process.env,
        TEST_DATABASE_URL: upgradeUrl,
        DATABASE_URL: upgradeUrl,
        DIRECT_URL: upgradeUrl,
      },
      upgradeUrl,
    );
    migrateDeploy(upgradePartialEnv);
    upgradeFixture = await seedUpgradeFixtures(upgradeUrl);

    restoreFollowUpMigrations();
    migrateDeploy(upgradePartialEnv);
    upgradeDeployOk = true;

    const collisionPartialEnv = buildDisposablePrismaMigrateProcessEnv(
      {
        ...process.env,
        TEST_DATABASE_URL: collisionUrl,
        DATABASE_URL: collisionUrl,
        DIRECT_URL: collisionUrl,
      },
      collisionUrl,
    );
    holdFollowUpMigrations();
    migrateDeploy(collisionPartialEnv);
    await seedCollisionFixture(collisionUrl);
    restoreFollowUpMigrations();
    const collisionResult = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      env: collisionPartialEnv,
      encoding: "utf8",
    });
    collisionBlocked = collisionResult.status !== 0;
  } finally {
    restoreFollowUpMigrations();
  }

  const upgradeRows = await loadMigrationRows(upgradeUrl);
  const repoChecksums = Object.fromEntries(
    SCE_PUBLIC_REFERENCE_MIGRATION_ORDER.map((m) => [m, migrationChecksum(m)]),
  );

  const foundationChecksum = migrationChecksum(SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION);
  if (foundationChecksum !== SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256) {
    throw new Error("Foundation migration checksum drifted from recorded STAGE checksum.");
  }

  const upgradePost =
    upgradeFixture && upgradeDeployOk
      ? await verifyPostUpgrade(upgradeUrl, upgradeFixture)
      : null;

  const report = {
    writePerformed: true,
    disposableTarget: maskDatabaseUrl(freshUrl),
    endpointsBeforeGuard: endpointsBefore,
    migrationOrder: [...SCE_PUBLIC_REFERENCE_MIGRATION_ORDER],
    foundationChecksumSha256: foundationChecksum,
    foundationChecksumMatchesStage: foundationChecksum === SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
    freshReplay: {
      appliedMigrations: freshRows.map((r) => ({
        name: r.migration_name,
        checksumMatch: r.checksum === repoChecksums[r.migration_name],
      })),
      allApplied: freshRows.length === SCE_PUBLIC_REFERENCE_MIGRATION_ORDER.length,
    },
    upgradePath: {
      foundationChecksumInDb: upgradeRows.find((r) => r.migration_name === SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION)
        ?.checksum,
      foundationChecksumMatch:
        upgradeRows.find((r) => r.migration_name === SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION)?.checksum ===
        SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
      allThreeApplied: upgradeRows.length === SCE_PUBLIC_REFERENCE_MIGRATION_ORDER.length,
      postUpgrade: upgradePost,
    },
    collisionFixture: {
      migrationFailedAsExpected: collisionBlocked,
    },
    note: "Replayed on disposable Postgres only; shared STAGE was not targeted.",
  };

  console.log(JSON.stringify(report, null, 2));

  const ok =
    report.freshReplay.allApplied &&
    report.upgradePath.foundationChecksumMatch &&
    report.upgradePath.allThreeApplied &&
    report.collisionFixture.migrationFailedAsExpected &&
  Boolean(upgradePost?.meldungId && upgradePost?.meldungCaseNumber);

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[sce-public-reference-disposable-migration-verify] FAILED:", error);
  process.exit(1);
});