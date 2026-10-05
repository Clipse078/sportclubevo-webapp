/**
 * FACILITY-INTEGRITY-01A — FCA Hauptfeld/Hauptplatz consolidation.
 *
 * Modes:
 *   --inventory   Reference matrix + shape validation (read-only)
 *   --dry-run     Planned actions, zero writes
 *   --execute     Live reconciliation (requires --confirm FIX-FCA-MAIN-PITCH)
 *
 * Usage:
 *   DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01a-fca-reconcile.ts --inventory
 *   DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01a-fca-reconcile.ts --dry-run
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=facility-integrity-01a-fca-reconcile:stage \
 *     DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01a-fca-reconcile.ts \
 *     --execute --confirm FIX-FCA-MAIN-PITCH
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { pathToFileURL } from "url";
import {
  buildReconciliationPlan,
  executeFcaMainPitchReconciliation,
  FCA_TENANT_KEY,
} from "@/lib/facilities/fca-main-pitch-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

export const EXECUTE_CONFIRMATION = "FIX-FCA-MAIN-PITCH";

function isCliEntrypoint(argvPath: string | undefined, moduleUrl: string): boolean {
  if (!argvPath) return false;
  try {
    return pathToFileURL(argvPath).href === moduleUrl;
  } catch {
    return false;
  }
}

export function detectEnvironment(url: string | undefined): string {
  const value = url?.toLowerCase() ?? "";
  if (value.includes("prod") || value.includes("production")) return "PROD";
  if (value.includes("stage")) return "STAGE";
  if (value.includes("acceptance") || value.includes("alpha")) return "ACCEPTANCE";
  if (value.includes("localhost") || value.includes("127.0.0.1")) return "LOCAL";
  return "UNKNOWN";
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<masked>";
  }
}

function createPrismaClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, pool };
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const has = (flag: string) => args.includes(flag);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  return {
    inventory: has("--inventory"),
    dryRun: has("--dry-run"),
    execute: has("--execute"),
    confirm: get("--confirm"),
  };
}

function printMatrix(title: string, matrix: Awaited<ReturnType<typeof buildReconciliationPlan>>["matrix"]) {
  console.log(`\n=== ${title} ===`);
  console.log(
    "SOURCE\tREFERENCE TYPE\tLEGACY COUNT\tTARGET COUNT\tTEMPORAL\tRECONCILIATION ACTION",
  );
  for (const row of matrix) {
    console.log(
      [
        row.source,
        row.referenceType,
        row.legacyCount,
        row.targetCount,
        row.temporal,
        row.reconciliationAction,
      ].join("\t"),
    );
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (!opts.inventory && !opts.dryRun && !opts.execute) {
    console.error("[facility-integrity-01a] Use --inventory, --dry-run, or --execute");
    process.exit(1);
  }

  if (opts.execute && opts.confirm !== EXECUTE_CONFIRMATION) {
    console.error(
      `[facility-integrity-01a] REFUSED: --execute requires --confirm ${EXECUTE_CONFIRMATION}`,
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[facility-integrity-01a] DATABASE_URL is not set.");
    process.exit(1);
  }

  const env = detectEnvironment(connectionString);
  if (env === "PROD") {
    console.error("[facility-integrity-01a] BLOCKED: DATABASE_URL appears to point to PRODUCTION.");
    process.exit(1);
  }

  if (opts.execute) {
    assertOperationalMutationAllowed({
      operationId: "facility-integrity-01a-fca-reconcile",
      databaseUrl: connectionString,
      explicitIntent: opts.confirm === EXECUTE_CONFIRMATION,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  console.log(`[facility-integrity-01a] Tenant: ${FCA_TENANT_KEY}`);
  console.log(`[facility-integrity-01a] Database: ${maskUrl(connectionString)} (${env})`);

  const { prisma, pool } = createPrismaClient(connectionString);

  try {
    if (opts.inventory || opts.dryRun) {
      const { plan, errors, matrix } = await buildReconciliationPlan(prisma);
      if (errors.length > 0) {
        console.error("[facility-integrity-01a] Shape errors:");
        for (const err of errors) console.error(`  - ${err}`);
        process.exit(1);
      }
      if (!plan) {
        console.log("[facility-integrity-01a] Already consolidated — no B_LEGACY_AND_CANONICAL pair.");
        process.exit(0);
      }

      console.log("\n=== INVENTORY ===");
      console.log(JSON.stringify(plan.inventory, null, 2));
      printMatrix("PRE_MIGRATION_REFERENCE_MATRIX", matrix);

      if (opts.dryRun) {
        console.log("\n=== DRY_RUN_PLAN ===");
        console.log(
          JSON.stringify(
            {
              resourceIdMap: Object.fromEntries(plan.resourceIdMap),
              archiveLegacyFacilityId: plan.inventory.legacyFacility.id,
              preserveCanonicalFacilityId: plan.inventory.canonicalFacility.id,
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    const result = await executeFcaMainPitchReconciliation(prisma, "execute");
    if (!result.success) {
      console.error("[facility-integrity-01a] FAILED:", result.errors.join("; "));
      process.exit(1);
    }

    if (!result.plan) {
      console.log("[facility-integrity-01a] Already consolidated — no changes applied.");
      return;
    }

    console.log("\n=== EXECUTION_STATS ===");
    console.log(JSON.stringify(result.stats, null, 2));
    if (result.postMatrix) {
      printMatrix("POST_MIGRATION_REFERENCE_MATRIX", result.postMatrix);
    }
    console.log(
      `\nActive main-pitch facility count: ${result.activeMainPitchFacilityCount ?? "n/a"}`,
    );
    console.log("[facility-integrity-01a] Reconciliation committed successfully.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (isCliEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((err) => {
    console.error("[facility-integrity-01a] FATAL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
