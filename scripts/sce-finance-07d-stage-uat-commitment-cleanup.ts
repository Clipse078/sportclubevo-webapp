/**
 * SCE-FINANCE-07D — remove PO UAT finance commitments from designated STAGE (fc-allschwil).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL npx tsx scripts/sce-finance-07d-stage-uat-commitment-cleanup.ts --dry-run
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     SCE_OPERATION_AUTHORIZATION=finance-07d-stage-uat-commitment-cleanup:stage \
 *     DATABASE_URL=$STAGE_DB_URL npx tsx scripts/sce-finance-07d-stage-uat-commitment-cleanup.ts \
 *     --execute --confirm SCE-FINANCE-07D-UAT-CLEANUP
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import {
  EXECUTE_CONFIRMATION,
  assertCleanupExecuteGuards,
  assertCleanupStageIdentityReadOnly,
  collectUatCommitmentCleanupInventory,
  executeUatCommitmentCleanupTransaction,
  inventoryHasDeletableUatTargets,
} from "@/lib/finance/commitment/finance-07d-stage-uat-commitment-cleanup";
import { getRuntimeDataEnvironment } from "@/lib/server/runtime-identity";

function parseArgs(argv: string[]): {
  dryRun: boolean;
  execute: boolean;
  confirm: string | null;
} {
  const execute = argv.includes("--execute");
  const dryRun = argv.includes("--dry-run") || !execute;
  let confirm: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") {
      confirm = argv[i + 1] ?? null;
    } else if (arg.startsWith("--confirm=")) {
      confirm = arg.split("=")[1] ?? null;
    }
  }
  return { dryRun, execute, confirm };
}

function printInventory(
  inventory: Awaited<ReturnType<typeof collectUatCommitmentCleanupInventory>>,
  mode: "dry-run" | "execute",
): void {
  console.log("=== SCE-FINANCE-07D STAGE UAT COMMITMENT CLEANUP ===");
  console.log("MODE:", mode);
  console.log("");
  console.log("ENVIRONMENT");
  console.log("  APP_ENV:", process.env.APP_ENV ?? "(unset)");
  console.log("  SCE_DATA_ENVIRONMENT:", getRuntimeDataEnvironment());
  console.log("  DB fingerprint:", inventory.databaseFingerprint ?? "—");
  console.log("");
  console.log("TENANT", inventory.tenantKey, inventory.tenantId);
  console.log("TENANT_COMMITMENT_COUNT:", inventory.tenantCommitmentCount);
  console.log("");
  for (const row of inventory.uatRows) {
    console.log("UAT_TARGET", {
      id: row.id,
      ledgerTitle: row.ledgerTitle,
      found: row.found,
      title: row.title,
      lifecycleStatus: row.lifecycleStatus,
      approvalStatus: row.approvalStatus,
      economicObligationKey: row.economicObligationKey,
      approvalDecisionCount: row.approvalDecisionCount,
      evidenceLinkIds: row.evidenceLinkIds,
      expectedEventIds: row.expectedEventIds,
      auditLogIds: row.auditLogIds,
    });
  }
  if (inventory.blockingErrors.length > 0) {
    console.log("");
    console.log("BLOCKING_ERRORS");
    for (const err of inventory.blockingErrors) {
      console.log("  -", err);
    }
  }
}

async function main(): Promise<void> {
  const { dryRun, execute, confirm } = parseArgs(process.argv.slice(2));
  assertCleanupStageIdentityReadOnly(process.env);
  const inventory = await collectUatCommitmentCleanupInventory(prisma);
  printInventory(inventory, execute ? "execute" : "dry-run");

  if (dryRun) {
    console.log("");
    console.log(
      "DRY_RUN complete — pass --execute --confirm",
      EXECUTE_CONFIRMATION,
      "with SCE_OPERATION_AUTHORIZATION to apply.",
    );
    if (inventory.blockingErrors.length > 0) {
      process.exit(1);
    }
    return;
  }

  assertCleanupExecuteGuards({
    execute: true,
    confirm,
    env: process.env,
    databaseUrl: process.env.DATABASE_URL,
  });

  if (inventory.blockingErrors.length > 0) {
    throw new Error(inventory.blockingErrors.join(" "));
  }
  if (!inventoryHasDeletableUatTargets(inventory)) {
    console.log("No UAT commitment targets remain — nothing to delete.");
    return;
  }

  const result = await executeUatCommitmentCleanupTransaction(prisma, inventory);
  console.log("");
  console.log("EXECUTE complete", result);

  const after = await collectUatCommitmentCleanupInventory(prisma);
  printInventory(after, "execute");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
