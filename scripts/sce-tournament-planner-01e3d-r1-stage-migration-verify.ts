/**
 * SCE-TOURNAMENT-PLANNER-01E3D-R1 — designated STAGE migration safety + integrity closure.
 *
 * Read-only inventory/audit:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3d-r1-stage-migration-verify.ts --phase=pre
 *
 * Post-migration verification:
 *   ... --phase=post --pre-snapshot=/path/to/pre.json
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-tournament-planner-01e3d-r1-stage-migration-verify.ts --apply
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
  "20261016210000_sce_tournament_planner_01e3d_knockout_qualification_mapping";

type Inventory = {
  tournamentCount: number;
  tournamentParticipantCount: number;
  tournamentPhaseCount: number;
  tournamentGroupCount: number;
  tournamentQualificationSourceCount: number;
  tournamentFixtureCount: number;
  tournamentFixtureSideCount: number;
  tournamentKnockoutQualificationMappingCount: number | "N/A";
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

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function loadInventory(): Promise<Inventory> {
  const hasMappingTable = await tableExists("TournamentKnockoutQualificationMapping");
  let tournamentKnockoutQualificationMappingCount: number | "N/A" = "N/A";
  if (hasMappingTable) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "TournamentKnockoutQualificationMapping"
    `;
    tournamentKnockoutQualificationMappingCount = Number(rows[0]?.count ?? 0);
  }
  const [
    tournamentCount,
    tournamentParticipantCount,
    tournamentPhaseCount,
    tournamentGroupCount,
    tournamentQualificationSourceCount,
    tournamentFixtureCount,
    tournamentFixtureSideCount,
  ] = await Promise.all([
    prisma.event.count({ where: { type: "TOURNAMENT" } }),
    prisma.tournamentParticipant.count(),
    prisma.tournamentPhase.count(),
    prisma.tournamentGroup.count(),
    prisma.tournamentQualificationSource.count(),
    prisma.tournamentFixture.count(),
    prisma.tournamentFixtureSide.count(),
  ]);
  return {
    tournamentCount,
    tournamentParticipantCount,
    tournamentPhaseCount,
    tournamentGroupCount,
    tournamentQualificationSourceCount,
    tournamentFixtureCount,
    tournamentFixtureSideCount,
    tournamentKnockoutQualificationMappingCount,
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

async function loadMappingFkDeleteRules(): Promise<Record<string, string>> {
  const rows = await prisma.$queryRaw<{ constraint_name: string; delete_rule: string }[]>`
    SELECT tc.constraint_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'TournamentKnockoutQualificationMapping'
      AND tc.constraint_type = 'FOREIGN KEY'
  `;
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.constraint_name] = row.delete_rule;
  }
  return out;
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
    appEnv: "stage",
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
    const pre = await loadInventory();
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
    const pre = JSON.parse(readFileSync(preSnapshotPath, "utf8")) as Inventory;
    const post = await loadInventory();
    const fkDeleteRules = await loadMappingFkDeleteRules();
    report.phase = "post";
    report.preMigration = pre;
    report.postMigration = post;
    report.mappingTableFkDeleteRules = fkDeleteRules;
    report.rowPreservation = {
      tournamentCount: post.tournamentCount === pre.tournamentCount,
      tournamentParticipantCount: post.tournamentParticipantCount === pre.tournamentParticipantCount,
      tournamentPhaseCount: post.tournamentPhaseCount === pre.tournamentPhaseCount,
      tournamentGroupCount: post.tournamentGroupCount === pre.tournamentGroupCount,
      tournamentQualificationSourceCount:
        post.tournamentQualificationSourceCount === pre.tournamentQualificationSourceCount,
      tournamentFixtureCount: post.tournamentFixtureCount === pre.tournamentFixtureCount,
      tournamentFixtureSideCount:
        post.tournamentFixtureSideCount === pre.tournamentFixtureSideCount,
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
