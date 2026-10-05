/**
 * FACILITY-INTEGRITY-01A-R2 — FCA Hauptplatz → Hauptfeld canonical terminology (STADION* codes unchanged).
 *
 * Modes:
 *   --inventory   List planned renames (read-only)
 *   --dry-run     Same as inventory
 *   --execute     Apply renames (requires --confirm FIX-FCA-MAIN-PITCH-TERMINOLOGY)
 *
 * Usage:
 *   DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01a-r2-fca-terminology.ts --inventory
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=facility-integrity-01a-r2-fca-terminology:stage \
 *     DATABASE_URL=<stage-url> npx tsx scripts/facility-integrity-01a-r2-fca-terminology.ts \
 *     --execute --confirm FIX-FCA-MAIN-PITCH-TERMINOLOGY
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { pathToFileURL } from "url";
import { FCA_TENANT_KEY } from "@/lib/facilities/fca-main-pitch-reconciliation";
import {
  buildFcaMainPitchTerminologyPlan,
  executeFcaMainPitchTerminologyReconciliation,
} from "@/lib/facilities/fca-main-pitch-terminology-reconciliation";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { detectEnvironment } from "./facility-integrity-01a-fca-reconcile";

export const EXECUTE_CONFIRMATION = "FIX-FCA-MAIN-PITCH-TERMINOLOGY";

function isCliEntrypoint(argvPath: string | undefined, moduleUrl: string): boolean {
  if (!argvPath) return false;
  try {
    return pathToFileURL(argvPath).href === moduleUrl;
  } catch {
    return false;
  }
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (!opts.inventory && !opts.dryRun && !opts.execute) {
    console.error("[facility-integrity-01a-r2] Use --inventory, --dry-run, or --execute");
    process.exit(1);
  }

  if (opts.execute && opts.confirm !== EXECUTE_CONFIRMATION) {
    console.error(
      `[facility-integrity-01a-r2] REFUSED: --execute requires --confirm ${EXECUTE_CONFIRMATION}`,
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[facility-integrity-01a-r2] DATABASE_URL is not set.");
    process.exit(1);
  }

  const env = detectEnvironment(connectionString);
  if (env === "PROD") {
    console.error("[facility-integrity-01a-r2] BLOCKED: DATABASE_URL appears to point to PRODUCTION.");
    process.exit(1);
  }

  if (opts.execute) {
    assertOperationalMutationAllowed({
      operationId: "facility-integrity-01a-r2-fca-terminology",
      databaseUrl: connectionString,
      explicitIntent: opts.confirm === EXECUTE_CONFIRMATION,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  console.log(`[facility-integrity-01a-r2] Tenant: ${FCA_TENANT_KEY}`);
  console.log(`[facility-integrity-01a-r2] Database: ${maskUrl(connectionString)} (${env})`);

  const { prisma, pool } = createPrismaClient(connectionString);

  try {
    const mode = opts.execute ? "execute" : opts.dryRun ? "dry-run" : "inventory";
    if (opts.inventory || opts.dryRun) {
      const { plan, errors } = await buildFcaMainPitchTerminologyPlan(prisma);
      if (errors.length > 0) {
        console.error("[facility-integrity-01a-r2] Plan errors:");
        for (const err of errors) console.error(`  - ${err}`);
        process.exit(1);
      }
      console.log("\n=== TERMINOLOGY_PLAN ===");
      console.log(JSON.stringify(plan, null, 2));
      if (plan?.alreadyCanonical) {
        console.log("[facility-integrity-01a-r2] Already canonical — no renames required.");
      }
      return;
    }

    const result = await executeFcaMainPitchTerminologyReconciliation(prisma, mode);
    if (!result.success) {
      console.error("[facility-integrity-01a-r2] FAILED:", result.errors.join("; "));
      process.exit(1);
    }

    console.log("\n=== EXECUTION_STATS ===");
    console.log(JSON.stringify(result.stats, null, 2));
    if (result.plan?.alreadyCanonical) {
      console.log("[facility-integrity-01a-r2] Already canonical — no changes applied.");
    } else {
      console.log("[facility-integrity-01a-r2] Terminology reconciliation committed successfully.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (isCliEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((err) => {
    console.error("[facility-integrity-01a-r2] FATAL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
