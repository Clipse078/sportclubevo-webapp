/**
 * SCE-TOURNAMENT-PLANNER-01E3B-R1 — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory/audit:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3b-r1-stage-migration-verify.ts --phase=pre
 *
 * Post-migration verification:
 *   ... --phase=post --pre-snapshot=/path/to/pre.json
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3b-r1-stage-migration-verify.ts --apply
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
  "20261016200000_sce_tournament_planner_01e3b_group_fixture_relation";

type Inventory = {
  tournamentCount: number;
  tournamentParticipantCount: number;
  tournamentPhaseCount: number;
  tournamentGroupCount: number;
  tournamentGroupMembershipCount: number;
  tournamentFixtureCount: number;
  tournamentFixtureSideCount: number;
  tournamentScheduleVersionCount: number;
  tournamentFixtureAssignmentCount: number;
};

type PreAudit = Inventory & {
  fixturesWithGroupIdCount: number | "N/A";
  fixturesWithNullGroupIdCount: number | "N/A";
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
    tournamentPhaseCount,
    tournamentGroupCount,
    tournamentGroupMembershipCount,
    tournamentFixtureCount,
    tournamentFixtureSideCount,
    tournamentScheduleVersionCount,
    tournamentFixtureAssignmentCount,
  ] = await Promise.all([
    prisma.event.count({ where: { type: "TOURNAMENT" } }),
    prisma.tournamentParticipant.count(),
    prisma.tournamentPhase.count(),
    prisma.tournamentGroup.count(),
    prisma.tournamentGroupMembership.count(),
    prisma.tournamentFixture.count(),
    prisma.tournamentFixtureSide.count(),
    prisma.tournamentScheduleVersion.count(),
    prisma.tournamentFixtureAssignment.count(),
  ]);
  return {
    tournamentCount,
    tournamentParticipantCount,
    tournamentPhaseCount,
    tournamentGroupCount,
    tournamentGroupMembershipCount,
    tournamentFixtureCount,
    tournamentFixtureSideCount,
    tournamentScheduleVersionCount,
    tournamentFixtureAssignmentCount,
  };
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function loadPreAudit(): Promise<PreAudit> {
  const inventory = await loadInventory();
  const hasGroupColumn = await columnExists("TournamentFixture", "tournamentGroupId");
  let fixturesWithGroupIdCount: number | "N/A" = "N/A";
  let fixturesWithNullGroupIdCount: number | "N/A" = "N/A";
  if (hasGroupColumn) {
    const grouped = await prisma.$queryRaw<{ with_group: bigint; without_group: bigint }[]>`
      SELECT
        COUNT(*) FILTER (WHERE "tournamentGroupId" IS NOT NULL)::bigint AS with_group,
        COUNT(*) FILTER (WHERE "tournamentGroupId" IS NULL)::bigint AS without_group
      FROM "TournamentFixture"
    `;
    fixturesWithGroupIdCount = Number(grouped[0]?.with_group ?? 0);
    fixturesWithNullGroupIdCount = Number(grouped[0]?.without_group ?? 0);
  }

  return {
    ...inventory,
    fixturesWithGroupIdCount,
    fixturesWithNullGroupIdCount,
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

async function loadGroupFixtureIntegrity() {
  const crossTournament = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentGroup" g ON g.id = f."tournamentGroupId"
    WHERE f."tournamentGroupId" IS NOT NULL AND g."eventId" <> f."eventId"
  `;
  const crossPhase = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentGroup" g ON g.id = f."tournamentGroupId"
    WHERE f."tournamentGroupId" IS NOT NULL
      AND f."tournamentPhaseId" IS NOT NULL
      AND g."tournamentPhaseId" <> f."tournamentPhaseId"
  `;
  const crossTenant = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentGroup" g ON g.id = f."tournamentGroupId"
    WHERE f."tournamentGroupId" IS NOT NULL AND g."tenantId" <> f."tenantId"
  `;
  const sideAOutsideGroup = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    WHERE f."tournamentGroupId" IS NOT NULL
      AND f."sideAParticipantId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "TournamentGroupMembership" m
        WHERE m."tournamentGroupId" = f."tournamentGroupId"
          AND m."tournamentParticipantId" = f."sideAParticipantId"
      )
  `;
  const sideBOutsideGroup = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    WHERE f."tournamentGroupId" IS NOT NULL
      AND f."sideBParticipantId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "TournamentGroupMembership" m
        WHERE m."tournamentGroupId" = f."tournamentGroupId"
          AND m."tournamentParticipantId" = f."sideBParticipantId"
      )
  `;
  const crossGroupFixtures = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "TournamentFixture" f
    JOIN "TournamentGroupMembership" ma ON ma."tournamentParticipantId" = f."sideAParticipantId"
      AND ma."eventId" = f."eventId"
    JOIN "TournamentGroupMembership" mb ON mb."tournamentParticipantId" = f."sideBParticipantId"
      AND mb."eventId" = f."eventId"
    WHERE f."tournamentGroupId" IS NOT NULL
      AND f."sideAParticipantId" IS NOT NULL
      AND f."sideBParticipantId" IS NOT NULL
      AND (
        ma."tournamentGroupId" <> f."tournamentGroupId"
        OR mb."tournamentGroupId" <> f."tournamentGroupId"
        OR ma."tournamentGroupId" <> mb."tournamentGroupId"
      )
  `;

  const fkOnDelete = await prisma.$queryRaw<{ delete_rule: string }[]>`
    SELECT rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'TournamentFixture'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'TournamentFixture_tournamentGroupId_fkey'
  `;

  return {
    crossTournamentGroupFixtureCount: Number(crossTournament[0]?.count ?? 0),
    crossPhaseGroupFixtureCount: Number(crossPhase[0]?.count ?? 0),
    crossTenantGroupFixtureCount: Number(crossTenant[0]?.count ?? 0),
    sideAOutsideFixtureGroupCount: Number(sideAOutsideGroup[0]?.count ?? 0),
    sideBOutsideFixtureGroupCount: Number(sideBOutsideGroup[0]?.count ?? 0),
    crossGroupFixtureCount: Number(crossGroupFixtures[0]?.count ?? 0),
    tournamentGroupIdFkDeleteRule: fkOnDelete[0]?.delete_rule ?? "MISSING",
  };
}

async function schemaUpToDate(): Promise<boolean> {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/.bin/prisma", "migrate", "status"],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return combined.includes("Database schema is up to date");
}

function applyMigrationGuarded(): void {
  const result = spawnSync("npm", ["run", "db:migrate:deploy-if-enabled"], {
    stdio: "inherit",
    env: {
      ...process.env,
      APPLY_DATABASE_MIGRATIONS: "true",
      APP_ENV: "stage",
      NODE_ENV: "production",
      SCE_DATA_ENVIRONMENT: "STAGE",
      SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
    },
  });
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
    stageHostFragment: KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS[0],
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
    report.databaseSchemaUpToDate = (await schemaUpToDate()) ? "YES" : "NO";
  }

  if (phase === "pre") {
    const pre = await loadPreAudit();
    report.phase = "pre";
    report.preMigration = pre;
    report.migrationAlreadyApplied = await migrationApplied();
    if (snapshotOut) {
      writeFileSync(snapshotOut, JSON.stringify(pre, null, 2));
    }
  }

  if (phase === "post") {
    if (!preSnapshotPath) {
      throw new Error("--pre-snapshot= required for --phase=post");
    }
    const pre = JSON.parse(readFileSync(preSnapshotPath, "utf8")) as PreAudit;
    const post = await loadInventory();
    const integrity = await loadGroupFixtureIntegrity();
    report.phase = "post";
    report.preMigration = pre;
    report.postMigration = post;
    report.groupFixtureIntegrity = integrity;
    report.rowPreservation = {
      tournamentCount: post.tournamentCount === pre.tournamentCount,
      tournamentParticipantCount: post.tournamentParticipantCount === pre.tournamentParticipantCount,
      tournamentPhaseCount: post.tournamentPhaseCount === pre.tournamentPhaseCount,
      tournamentGroupCount: post.tournamentGroupCount === pre.tournamentGroupCount,
      tournamentGroupMembershipCount:
        post.tournamentGroupMembershipCount === pre.tournamentGroupMembershipCount,
      tournamentFixtureCount: post.tournamentFixtureCount === pre.tournamentFixtureCount,
      tournamentFixtureSideCount:
        post.tournamentFixtureSideCount === pre.tournamentFixtureSideCount,
      tournamentScheduleVersionCount:
        post.tournamentScheduleVersionCount === pre.tournamentScheduleVersionCount,
      tournamentFixtureAssignmentCount:
        post.tournamentFixtureAssignmentCount === pre.tournamentFixtureAssignmentCount,
    };
    report.migrationAppliedToStage = (await migrationApplied()) ? "YES" : "NO";
    report.databaseSchemaUpToDate = (await schemaUpToDate()) ? "YES" : "NO";
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
