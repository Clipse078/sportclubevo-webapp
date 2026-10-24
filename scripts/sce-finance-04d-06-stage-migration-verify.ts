/**
 * SCE-FINANCE-04D-06 — designated STAGE migration safety + read-only finance integrity inventory.
 *
 * Read-only inventory:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04d-06-stage-migration-verify.ts --phase=pre
 *
 * Apply migration (guarded deploy only):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     APPLY_DATABASE_MIGRATIONS=true DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04d-06-stage-migration-verify.ts --apply
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

export const MIGRATION_NAME =
  "20261024180000_sce_finance_04d_06_scenario_adoption_rebase";

type IntegritySnapshot = {
  financeForecastCount: number;
  financeForecastVersionCount: number;
  financeForecastLineCount: number;
  financeScenarioCount: number;
};

function assertDesignatedStage(): { fingerprint: string; host: string; database: string } {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`);
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

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

export async function loadIntegritySnapshot(): Promise<IntegritySnapshot> {
  const [
    financeForecastCount,
    financeForecastVersionCount,
    financeForecastLineCount,
    financeScenarioCount,
  ] = await Promise.all([
    prisma.financeForecast.count(),
    prisma.financeForecastVersion.count(),
    prisma.financeForecastLine.count(),
    prisma.financeScenario.count(),
  ]);
  return {
    financeForecastCount,
    financeForecastVersionCount,
    financeForecastLineCount,
    financeScenarioCount,
  };
}

function existingFinancePreserved(pre: IntegritySnapshot, post: IntegritySnapshot): boolean {
  return (
    pre.financeForecastCount === post.financeForecastCount &&
    pre.financeForecastVersionCount === post.financeForecastVersionCount &&
    pre.financeForecastLineCount === post.financeForecastLineCount &&
    pre.financeScenarioCount === post.financeScenarioCount
  );
}

async function migrationApplied(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME} AND finished_at IS NOT NULL
  `;
  return rows.length > 0;
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
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const stage = assertDesignatedStage();
  const pre = await loadIntegritySnapshot();
  const appliedBefore = await migrationApplied();

  console.log(
    JSON.stringify(
      {
        migration: MIGRATION_NAME,
        stage,
        phase: apply ? "apply" : "pre",
        appliedBefore,
        financeScenarioAdoptionTable: await tableExists("FinanceScenarioAdoption"),
        financeScenarioRebaseTable: await tableExists("FinanceScenarioRebase"),
        integrityPre: pre,
      },
      null,
      2,
    ),
  );

  if (apply) {
    applyMigrationGuarded();
    const appliedAfter = await migrationApplied();
    const post = await loadIntegritySnapshot();
    const preserved = existingFinancePreserved(pre, post);
    console.log(
      JSON.stringify(
        {
          appliedAfter,
          integrityPost: post,
          existingFinancePreserved: preserved,
          financeScenarioAdoptionTable: await tableExists("FinanceScenarioAdoption"),
          financeScenarioRebaseTable: await tableExists("FinanceScenarioRebase"),
        },
        null,
        2,
      ),
    );
    if (!preserved) {
      throw new Error("Finance business row counts changed during migration apply.");
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
