/**
 * scripts/club-directory-02c-sfv-consolidation.ts
 *
 * CLUB-DIRECTORY-02C — Canonical Club Consolidation backfill.
 *
 * PROBLEM
 *   Before this slice, every SFV opponent team discovered via schedule sync
 *   got its own dedicated ExternalClub (see discovery-service.ts's module
 *   doc for the forward-looking fix that stops this from recurring). This
 *   script reconciles STAGE data that was ALREADY split by that limitation
 *   before the fix landed — the "PRE-EXISTING DUPLICATES" requirement.
 *
 * IDENTITY
 *   Uses the exact same provider-club-identity signal as the forward fix:
 *   SFV's `clubNumber`, resolved from GET /api/team/list (own teams) and
 *   GET /api/club/ranking (every team — own AND opponents — appearing in
 *   the tenant's current league/group standings). See
 *   lib/integrations/sfv/sync/club-identity.ts for the full investigation.
 *   A team whose clubNumber cannot be resolved this run is left completely
 *   untouched — never guessed at, never merged by name.
 *
 * SCOPE
 *   - Every tenant with an enabled TenantSfvConfig (or a single tenant via
 *     `--tenant <tenantKey>`).
 *   - Provider SFV only.
 *   - Never touches a team the SFV data does not currently resolve a
 *     clubNumber for.
 *   - Never deletes anything (see lib/club-directory/consolidation-service.ts
 *     for the full safety invariants — teams are re-parented, never lost;
 *     losing clubs are archived, never deleted; provider mappings are
 *     never deleted).
 *
 * Modes:
 *   --inventory   Read-only: reports every duplicate-club group found per
 *                 tenant (teams currently spanning >1 ExternalClub for the
 *                 same resolved clubNumber). Makes live (read-only) SFV
 *                 calls to resolve clubNumber, but ZERO database writes.
 *   --dry-run     Read-only: same as --inventory, plus the EXACT merge
 *                 decision (canonical club, teams to move, logo donor,
 *                 clubs to archive) using the same pure decision functions
 *                 the real execution path uses
 *                 (chooseCanonicalClubId / chooseLogoDonor from
 *                 lib/club-directory/consolidation-service.ts) — so the
 *                 preview can never drift from what --execute will do.
 *                 ZERO database writes.
 *   --execute     Live execution via the real, transactional consolidation
 *                 service. Requires --confirm CONSOLIDATE-CLUB-DIRECTORY.
 *
 * Usage:
 *   DATABASE_URL=<url> npx tsx scripts/club-directory-02c-sfv-consolidation.ts --inventory
 *   DATABASE_URL=<url> npx tsx scripts/club-directory-02c-sfv-consolidation.ts --dry-run
 *   DATABASE_URL=<url> npx tsx scripts/club-directory-02c-sfv-consolidation.ts \
 *     --execute --confirm CONSOLIDATE-CLUB-DIRECTORY [--tenant fc-allschwil]
 *
 * Safety:
 *   - Refuses to run --execute against a DATABASE_URL that looks like production.
 *   - Requires the SFV integration credentials (SFV_* env vars) to already
 *     be configured for a live clubNumber resolution — refuses to run any
 *     mode without them (never falls back to guessing identity).
 *   - Writes a pre-change JSON backup (every affected ExternalClub,
 *     ExternalTeam, and ExternalClubProviderMapping row) to .tmp/
 *     (gitignored) before executing.
 *   - Delegates every actual write to the same transactional, per-group
 *     service used by ordinary sync (lib/club-directory/consolidation-service.ts)
 *     — this script adds NO parallel mutation logic of its own.
 *   - Prints a basic postcondition check after executing: every group
 *     reported as a duplicate before the run now resolves to exactly one
 *     distinct ExternalClub.
 *
 * Shared logic (inventory, plans, backup snapshot contents) lives in
 * lib/club-directory/sfv-consolidation-02c.ts — imported by STAGE ops API
 * routes and re-exported here for CLI/tests.
 */

import "dotenv/config";

import fs from "fs";
import path from "path";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

export * from "@/lib/club-directory/sfv-consolidation-02c";

import {
  EXECUTE_CONFIRMATION,
  buildBackupSnapshot,
  buildTenantPlan,
  createPrismaClient,
  detectEnvironment,
  isCliEntrypoint,
  loadTenantInventory,
  maskUrl,
  resolveTenantContexts,
  type TenantInventory,
  type TenantPlan,
} from "@/lib/club-directory/sfv-consolidation-02c";

// `club-consolidation.ts` (the mutating orchestrator) transitively imports
// the shared `@/lib/db/prisma` singleton, which throws at import time when
// DATABASE_URL is unset. Importing it dynamically — only inside the
// `--execute` branch in `main()` below — lets every PURE function in the
// shared lib module stay unit-testable in isolation without requiring
// DATABASE_URL just to import the module.
type RunSfvClubConsolidationForTenant =
  typeof import("@/lib/integrations/sfv/sync/club-consolidation").runSfvClubConsolidationForTenant;

/** CLI-only: writes pre-change backup JSON under `.tmp/` (not used by ops routes). */
export function writeBackupToDisk(snapshot: unknown, outDir = ".tmp"): string {
  const dir = path.resolve(process.cwd(), outDir);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `club-directory-02c-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  return filePath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOptions {
  inventory: boolean;
  dryRun: boolean;
  execute: boolean;
  confirm: string | undefined;
  tenant: string | undefined;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const has = (flag: string) => args.includes(flag);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  return {
    inventory: has("--inventory"),
    dryRun: has("--dry-run"),
    execute: has("--execute"),
    confirm: get("--confirm"),
    tenant: get("--tenant"),
  };
}

function printInventory(inventories: TenantInventory[]): void {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  CLUB-DIRECTORY-02C — Inventory Mode (read-only)");
  console.log("═══════════════════════════════════════════════════════\n");

  for (const inv of inventories) {
    console.log(`  Tenant: ${inv.tenant.tenantKey} (${inv.tenant.tenantId})`);
    console.log(`    Resolved clubNumbers this run : ${inv.resolvedTeamCount} teamIds`);
    console.log(`    Duplicate groups found        : ${inv.duplicateGroups.length}`);
    for (const g of inv.duplicateGroups) {
      console.log(
        `      clubNumber ${g.providerClubId}: ${g.distinctClubIds.length} distinct clubs, ${g.teamCount} teams (providerTeamIds: ${g.providerTeamIds.join(", ")})`,
      );
    }
    console.log("");
  }
}

function printPlans(plans: TenantPlan[]): void {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  CLUB-DIRECTORY-02C — Dry-Run Mode (zero DB writes)");
  console.log("═══════════════════════════════════════════════════════\n");

  for (const plan of plans) {
    console.log(`  Tenant: ${plan.tenant.tenantKey} (${plan.tenant.tenantId})`);
    for (const g of plan.groups) {
      console.log(
        `    clubNumber ${g.providerClubId}: canonical=${g.canonicalClubId}, archive=[${g.clubsToArchive.join(", ")}], teamsToMove=${g.teamsToMove}, logoAdoptedFrom=${g.logoAdoptedFromClubId ?? "(none)"}`,
      );
    }
    console.log("");
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (!opts.inventory && !opts.dryRun && !opts.execute) {
    console.error(
      "[club-directory-02c] ERROR: No mode specified. Use --inventory, --dry-run, or --execute.",
    );
    process.exit(1);
  }

  if (opts.execute && opts.confirm !== EXECUTE_CONFIRMATION) {
    console.error(
      `[club-directory-02c] REFUSED: --execute requires --confirm ${EXECUTE_CONFIRMATION}`,
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[club-directory-02c] ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const env = detectEnvironment(connectionString);
  if (opts.execute && env === "PROD") {
    console.error("[club-directory-02c] BLOCKED: DATABASE_URL appears to point to PRODUCTION.");
    process.exit(1);
  }

  if (opts.execute) {
    assertOperationalMutationAllowed({
      operationId: "club-directory-02c-consolidation",
      databaseUrl: connectionString,
      explicitIntent: opts.confirm === EXECUTE_CONFIRMATION,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  console.log(`[club-directory-02c] Database: ${maskUrl(connectionString)}`);
  console.log(`[club-directory-02c] Detected environment: ${env}`);

  const { prisma, pool } = createPrismaClient(connectionString);

  try {
    const tenants = await resolveTenantContexts(prisma, opts.tenant);
    if (tenants.length === 0) {
      console.log(
        `[club-directory-02c] No enabled SFV-configured tenant found${opts.tenant ? ` for --tenant ${opts.tenant}` : ""}.`,
      );
      return;
    }

    const inventories: TenantInventory[] = [];
    for (const tenant of tenants) {
      inventories.push(await loadTenantInventory(prisma, tenant));
    }

    if (opts.inventory) printInventory(inventories);

    if (opts.dryRun) {
      const plans: TenantPlan[] = [];
      for (const inv of inventories) {
        plans.push(await buildTenantPlan(prisma, inv));
      }
      printPlans(plans);
    }

    if (opts.execute) {
      const totalGroups = inventories.reduce((sum, inv) => sum + inv.duplicateGroups.length, 0);
      if (totalGroups === 0) {
        console.log("[club-directory-02c] Nothing to consolidate — no duplicate groups found.");
        return;
      }

      const backupSnapshot = await buildBackupSnapshot(prisma, inventories);
      const backupPath = writeBackupToDisk(backupSnapshot);
      console.log(`[club-directory-02c] Pre-change backup written to: ${backupPath}`);

      const { runSfvClubConsolidationForTenant }: { runSfvClubConsolidationForTenant: RunSfvClubConsolidationForTenant } =
        await import("@/lib/integrations/sfv/sync/club-consolidation");

      let groupsMerged = 0;
      let teamsMoved = 0;
      let clubsArchived = 0;

      for (const inv of inventories) {
        if (inv.duplicateGroups.length === 0) continue;

        const { consolidation } = await runSfvClubConsolidationForTenant(
          inv.tenant.tenantId,
          inv.tenant.clubId,
          inv.tenant.seasonId,
          inv.tenant.organisationId,
        );

        groupsMerged += consolidation.groupsMerged;
        teamsMoved += consolidation.teamsMoved;
        clubsArchived += consolidation.clubsArchived;

        console.log(
          `[club-directory-02c] Tenant ${inv.tenant.tenantKey}: groupsMerged=${consolidation.groupsMerged}, teamsMoved=${consolidation.teamsMoved}, clubsArchived=${consolidation.clubsArchived}`,
        );
      }

      console.log("\n── EXECUTION RESULT ─────────────────────────────────────");
      console.log(`  Groups merged     : ${groupsMerged}`);
      console.log(`  Teams re-parented : ${teamsMoved}`);
      console.log(`  Clubs archived    : ${clubsArchived}`);

      // Postcondition: re-run inventory — every previously-duplicate group
      // must now resolve to exactly one distinct club.
      let allResolved = true;
      for (const tenant of tenants) {
        const after = await loadTenantInventory(prisma, tenant);
        if (after.duplicateGroups.length > 0) {
          allResolved = false;
          console.error(
            `[club-directory-02c] POSTCONDITION FAILED for ${tenant.tenantKey}: ${after.duplicateGroups.length} duplicate group(s) still remain.`,
          );
        }
      }

      if (!allResolved) {
        console.error(
          "[club-directory-02c] Some groups remain unresolved (see above) — review the SFV data for these teams manually. No data was deleted.",
        );
        process.exit(1);
      }

      console.log("\n[club-directory-02c] Consolidation complete. Every reported duplicate group is now canonical.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (isCliEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((err) => {
    console.error("[club-directory-02c] FATAL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
