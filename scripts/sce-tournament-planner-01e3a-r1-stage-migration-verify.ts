/**
 * SCE-TOURNAMENT-PLANNER-01E3A-R1 — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory/audit:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3a-r1-stage-migration-verify.ts --phase=pre
 *
 * Post-migration verification:
 *   ... --phase=post --pre-snapshot=/path/to/pre.json
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3a-r1-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const MIGRATION_NAME =
  "20261016190000_sce_tournament_planner_01e3a_competition_phase_qualification";

type Inventory = {
  tournamentCount: number;
  tournamentParticipantCount: number;
  tournamentFixtureCount: number;
  tournamentScheduleVersionCount: number;
  tournamentFixtureAssignmentCount: number;
};

type PreAudit = Inventory & {
  orphanSideACount: number;
  orphanSideBCount: number;
  crossTournamentSideCount: number;
  crossTenantSideCount: number;
  existingFixturesAllConcrete: "YES" | "NO" | "N/A";
  concreteFixtureCount: number;
};

function assertDesignatedStage(): { fingerprint: string; host: string; database: string } {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(
      `STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
  }
  if (getRuntimeDataEnvironment() !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const configured = process.env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase();
  if (configured !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `SCE_DATA_DATABASE_FINGERPRINT must be ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  if (fingerprint !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `Effective database fingerprint ${fingerprint ?? "null"} !== designated STAGE ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const hostOk = KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS.some((frag) => host.includes(frag));
  if (!hostOk) {
    throw new Error(`Database host ${host} is not a known designated STAGE Neon cluster.`);
  }
  return { fingerprint, host, database };
}

async function loadInventory(): Promise<Inventory> {
  const [
    tournamentCount,
    tournamentParticipantCount,
    tournamentFixtureCount,
    tournamentScheduleVersionCount,
    tournamentFixtureAssignmentCount,
  ] = await Promise.all([
    prisma.event.count({ where: { type: "TOURNAMENT" } }),
    prisma.tournamentParticipant.count(),
    prisma.tournamentFixture.count(),
    prisma.tournamentScheduleVersion.count(),
    prisma.tournamentFixtureAssignment.count(),
  ]);
  return {
    tournamentCount,
    tournamentParticipantCount,
    tournamentFixtureCount,
    tournamentScheduleVersionCount,
    tournamentFixtureAssignmentCount,
  };
}

async function loadPreAudit(): Promise<PreAudit> {
  const inventory = await loadInventory();

  const orphanSideA = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    WHERE f."sideAParticipantId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "TournamentParticipant" p
        WHERE p.id = f."sideAParticipantId"
      )
  `;
  const orphanSideB = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    WHERE f."sideBParticipantId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "TournamentParticipant" p
        WHERE p.id = f."sideBParticipantId"
      )
  `;
  const crossTournament = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentParticipant" pa ON pa.id = f."sideAParticipantId"
    WHERE f."sideAParticipantId" IS NOT NULL AND pa."eventId" <> f."eventId"
  `;
  const crossTournamentB = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentParticipant" pb ON pb.id = f."sideBParticipantId"
    WHERE f."sideBParticipantId" IS NOT NULL AND pb."eventId" <> f."eventId"
  `;
  const crossTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    LEFT JOIN "TournamentParticipant" pa ON pa.id = f."sideAParticipantId"
    LEFT JOIN "TournamentParticipant" pb ON pb.id = f."sideBParticipantId"
    WHERE (pa.id IS NOT NULL AND pa."tenantId" <> f."tenantId")
       OR (pb.id IS NOT NULL AND pb."tenantId" <> f."tenantId")
  `;

  const nonConcrete = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    WHERE f."sideAParticipantId" IS NULL OR f."sideBParticipantId" IS NULL
  `;

  const fixtureCount = inventory.tournamentFixtureCount;
  const nonConcreteCount = Number(nonConcrete[0]?.count ?? 0);
  let existingFixturesAllConcrete: PreAudit["existingFixturesAllConcrete"] = "N/A";
  if (fixtureCount > 0) {
    existingFixturesAllConcrete = nonConcreteCount === 0 ? "YES" : "NO";
  }

  return {
    ...inventory,
    orphanSideACount: Number(orphanSideA[0]?.count ?? 0),
    orphanSideBCount: Number(orphanSideB[0]?.count ?? 0),
    crossTournamentSideCount:
      Number(crossTournament[0]?.count ?? 0) + Number(crossTournamentB[0]?.count ?? 0),
    crossTenantSideCount: Number(crossTenant[0]?.count ?? 0),
    existingFixturesAllConcrete,
    concreteFixtureCount: fixtureCount,
  };
}

async function migrationApplied(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME}
  `;
  return rows.some((r) => r.finished_at != null);
}

async function loadPostIntegrity(pre: PreAudit) {
  const post = await loadInventory();
  const tableExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'TournamentFixtureSide'
    ) AS exists
  `;
  const hasSideTable = tableExists[0]?.exists === true;

  let fixtureSideBackfill = {
    expectedFixtureSideRows: "N/A" as number | "N/A",
    actualBackfilledFixtureSideRows: "N/A" as number | "N/A",
    concreteSideMismatchCount: "N/A" as number | "N/A",
    duplicateFixtureSideCount: "N/A" as number | "N/A",
  };

  if (pre.tournamentFixtureCount > 0 && hasSideTable) {
    const sideCount = await prisma.tournamentFixtureSide.count();
    const mismatch = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "TournamentFixture" f
      LEFT JOIN "TournamentFixtureSide" sa ON sa."fixtureId" = f.id AND sa.side = 'A'
      LEFT JOIN "TournamentFixtureSide" sb ON sb."fixtureId" = f.id AND sb.side = 'B'
      WHERE (
        (f."sideAParticipantId" IS NOT NULL AND (
          sa.id IS NULL OR sa."sourceType" <> 'CONCRETE_PARTICIPANT'
          OR sa."participantId" IS DISTINCT FROM f."sideAParticipantId"
        ))
        OR (f."sideBParticipantId" IS NOT NULL AND (
          sb.id IS NULL OR sb."sourceType" <> 'CONCRETE_PARTICIPANT'
          OR sb."participantId" IS DISTINCT FROM f."sideBParticipantId"
        ))
      )
    `;
    const duplicates = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "fixtureId", side, COUNT(*) AS c
        FROM "TournamentFixtureSide"
        GROUP BY "fixtureId", side
        HAVING COUNT(*) > 1
      ) d
    `;
    const qualOnLegacyConcrete = await prisma.tournamentFixtureSide.count({
      where: {
        sourceType: "QUALIFICATION_REFERENCE",
        fixture: {
          OR: [{ sideAParticipantId: { not: null } }, { sideBParticipantId: { not: null } }],
        },
      },
    });

    fixtureSideBackfill = {
      expectedFixtureSideRows: pre.tournamentFixtureCount * 2,
      actualBackfilledFixtureSideRows: sideCount,
      concreteSideMismatchCount:
        Number(mismatch[0]?.count ?? 0) + (qualOnLegacyConcrete > 0 ? qualOnLegacyConcrete : 0),
      duplicateFixtureSideCount: Number(duplicates[0]?.count ?? 0),
    };
  }

  const crossTenantPhase = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentPhase" tp
    JOIN "Event" e ON e.id = tp."eventId"
    WHERE tp."tenantId" <> e."tenantId"
  `;
  const crossTournamentFixturePhase = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentPhase" tp ON tp.id = f."tournamentPhaseId"
    WHERE f."tournamentPhaseId" IS NOT NULL AND tp."eventId" <> f."eventId"
  `;
  const invalidPhaseOrder = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT tp."eventId", tp."displayOrder", COUNT(*) AS c
      FROM "TournamentPhase" tp
      GROUP BY tp."eventId", tp."displayOrder"
      HAVING COUNT(*) > 1
    ) x
  `;

  return {
    post,
    fixtureSideBackfill,
    crossTenantPhaseCount: Number(crossTenantPhase[0]?.count ?? 0),
    crossTournamentFixturePhaseCount: Number(crossTournamentFixturePhase[0]?.count ?? 0),
    invalidPhaseOrderCount: Number(invalidPhaseOrder[0]?.count ?? 0),
    preserved: {
      tournamentParticipantCount:
        post.tournamentParticipantCount === pre.tournamentParticipantCount,
      tournamentFixtureCount: post.tournamentFixtureCount === pre.tournamentFixtureCount,
      tournamentScheduleVersionCount:
        post.tournamentScheduleVersionCount === pre.tournamentScheduleVersionCount,
      tournamentFixtureAssignmentCount:
        post.tournamentFixtureAssignmentCount === pre.tournamentFixtureAssignmentCount,
    },
  };
}

function applyMigrationGuarded(): void {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/.bin/tsx", "scripts/deploy-migrations-if-enabled.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        APPLY_DATABASE_MIGRATIONS: "true",
        APP_ENV: "stage",
        NODE_ENV: "production",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`Guarded migration deploy failed with status ${result.status ?? "unknown"}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const phase = args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "pre";
  const apply = args.includes("--apply");
  const snapshotOut = args.find((a) => a.startsWith("--snapshot-out="))?.split("=")[1];
  const preSnapshotPath = args.find((a) => a.startsWith("--pre-snapshot="))?.split("=")[1];

  const identity = assertDesignatedStage();
  const report: Record<string, unknown> = {
    designatedStageIdentityVerified: "YES",
    stageDatabaseFingerprint: identity.fingerprint,
    stageHost: identity.host,
    stageDatabaseName: identity.database,
    migrationName: MIGRATION_NAME,
    prodTouched: "NO",
  };

  if (apply) {
    if (await migrationApplied()) {
      report.migrationAppliedToStage = "YES_ALREADY";
    } else {
      applyMigrationGuarded();
      report.migrationAppliedToStage = (await migrationApplied()) ? "YES" : "NO";
    }
  }

  if (phase === "pre") {
    const pre = await loadPreAudit();
    report.phase = "pre";
    report.preMigration = pre;
    report.migrationAlreadyApplied = await migrationApplied();
    if (snapshotOut) {
      writeFileSync(snapshotOut, JSON.stringify(pre, null, 2));
    }
    const blockers: string[] = [];
    if (pre.orphanSideACount > 0) blockers.push("ORPHAN_SIDE_A");
    if (pre.orphanSideBCount > 0) blockers.push("ORPHAN_SIDE_B");
    if (pre.crossTournamentSideCount > 0) blockers.push("CROSS_TOURNAMENT_SIDE");
    if (pre.crossTenantSideCount > 0) blockers.push("CROSS_TENANT_SIDE");
    if (pre.existingFixturesAllConcrete === "NO") blockers.push("NON_CONCRETE_FIXTURE_SIDES");
    report.preMigrationBlockers = blockers;
  }

  if (phase === "post") {
    if (!preSnapshotPath) {
      throw new Error("--pre-snapshot= required for --phase=post");
    }
    const pre = JSON.parse(readFileSync(preSnapshotPath, "utf8")) as PreAudit;
    const postReport = await loadPostIntegrity(pre);
    report.phase = "post";
    report.preMigration = pre;
    report.postMigration = postReport.post;
    report.fixtureSideBackfill = postReport.fixtureSideBackfill;
    report.relationalIntegrity = {
      crossTenantPhaseCount: postReport.crossTenantPhaseCount,
      crossTournamentFixturePhaseCount: postReport.crossTournamentFixturePhaseCount,
      invalidPhaseOrderCount: postReport.invalidPhaseOrderCount,
    };
    report.rowPreservation = postReport.preserved;
    report.migrationAppliedToStage = (await migrationApplied()) ? "YES" : "NO";
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
