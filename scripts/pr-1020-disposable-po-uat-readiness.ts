/**
 * PR #1020 — read-only disposable readiness (migration + fixture inventory).
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { DevelopmentSprintStatus, PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  PR_1020_DISPOSABLE_ORG_UNIT_ID,
  PR_1020_DISPOSABLE_PHASE_IDS,
  PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER,
  PR_1020_DISPOSABLE_TASK_ID,
} from "./pr-1020-disposable-umsetzungsplanung-fixture";
import { CD_UMSETZUNGSPLANUNG_SECTION_QUERY } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import { maskDatabaseUrl, parseDatabaseTarget } from "@/lib/test/safe-test-database";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";

const PLANNED_SPRINT_RANK_MIGRATION = "20261121180000_sce_cd_planned_sprint_rank" as const;

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function main(): Promise<void> {
  const url = assertSafeTestDatabase();
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const target = parseDatabaseTarget(url);
  const migrationRow = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string; finished_at: Date | null }>
  >`
    SELECT migration_name, checksum, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${PLANNED_SPRINT_RANK_MIGRATION}
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `;

  const repoChecksum = migrationChecksum(PLANNED_SPRINT_RANK_MIGRATION);
  const row = migrationRow[0];

  const phases = await prisma.developmentSprint.findMany({
    where: {
      id: {
        in: [
          PR_1020_DISPOSABLE_PHASE_IDS.active,
          PR_1020_DISPOSABLE_PHASE_IDS.plannedA,
          PR_1020_DISPOSABLE_PHASE_IDS.plannedB,
        ],
      },
    },
    select: { id: true, title: true, status: true, plannedWorkspaceRank: { select: { rank: true } } },
    orderBy: { title: "asc" },
  });

  const unplannedTask = await prisma.task.findUnique({
    where: { id: PR_1020_DISPOSABLE_TASK_ID },
    select: { id: true, title: true, scePublicNumber: true },
  });

  const activeCount = phases.filter((p) => p.status === DevelopmentSprintStatus.ACTIVE).length;
  const plannedCount = phases.filter((p) => p.status === DevelopmentSprintStatus.PLANNED).length;

  const previewBase = process.env.PR_1020_PREVIEW_BASE?.trim() || "https://acceptance.sportclubevo.com";
  const commitSha = process.env.PR_1020_COMMIT_SHA?.trim() || "cccdb0ef956babe1ffd6c491a87cf4b90d60ce44";

  const base = previewBase.replace(/\/$/, "");
  const orgQuery = `${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(PR_1020_DISPOSABLE_ORG_UNIT_ID)}`;
  const readyUrl = `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${CD_UMSETZUNGSPLANUNG_SECTION_QUERY}=ungeplant&${orgQuery}&dpl=${commitSha.slice(0, 12)}`;

  const schemaReady = Boolean(row?.checksum === repoChecksum);
  const fixturesReady =
    activeCount === 1 &&
    plannedCount === 2 &&
    Boolean(unplannedTask?.scePublicNumber === PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER);

  const serializedTask = unplannedTask
    ? {
        ...unplannedTask,
        scePublicNumber: unplannedTask.scePublicNumber?.toString() ?? null,
      }
    : null;

  console.log(
    JSON.stringify(
      {
        pullRequest: 1020,
        verifiedCommitSha: commitSha,
        database: {
          masked: maskDatabaseUrl(url),
          host: target.hostname,
          name: target.database,
        },
        plannedSprintRankMigration: {
          name: PLANNED_SPRINT_RANK_MIGRATION,
          applied: Boolean(row),
          checksumMatch: row?.checksum === repoChecksum,
          repoChecksum,
          checksumInDb: row?.checksum ?? null,
        },
        fixtureInventory: {
          orgUnitId: PR_1020_DISPOSABLE_ORG_UNIT_ID,
          activePhases: activeCount,
          plannedPhases: plannedCount,
          phases,
          unplannedTask: serializedTask,
        },
        poReady: schemaReady && fixturesReady,
        readyUrlTemplate: readyUrl,
        writeSafeEnvironment:
          "Isolated disposable Postgres (this database) or Vercel Custom Environment `acceptance` + sce_acceptance — never shared STAGE.",
        operatorBlocker: schemaReady && fixturesReady
          ? null
          : "Run scripts/pr-1020-disposable-umsetzungsplanung-fixture.ts after migrate deploy.",
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
  if (!schemaReady || !fixturesReady) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[pr-1020-disposable-po-uat-readiness] FAILED:", error);
  process.exit(1);
});