/**
 * SWISS-CLEANUP-01 — Remove obsolete STAGE synthetic billing acceptance data.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     npx tsx scripts/swiss-cleanup-01-stage-billing-acceptance-data.ts --dry-run
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     SCE_OPERATION_AUTHORIZATION=swiss-cleanup-01-stage:stage \
 *     npx tsx scripts/swiss-cleanup-01-stage-billing-acceptance-data.ts \
 *     --execute --confirm SCE-SWISS-CLEANUP-01-STAGE
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import {
  OPERATION_ID,
  PROTECTED_LEGAL_ENTITY_KEY,
  SYNTHETIC_INVOICE_NUMBERS,
  assertCleanupExecuteGuards,
  assertCleanupStageIdentityReadOnly,
  collectCleanupInventory,
  executeCleanupTransaction,
  inventoryHasSyntheticTargets,
} from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
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

function printReport(
  inventory: Awaited<ReturnType<typeof collectCleanupInventory>>,
  mode: "dry-run" | "execute",
): void {
  const { fca, synthetic } = inventory;
  console.log("=== SWISS-CLEANUP-01 STAGE BILLING ACCEPTANCE DATA ===");
  console.log("MODE:", mode);
  console.log("");
  console.log("ENVIRONMENT");
  console.log("  APP_ENV:", process.env.APP_ENV ?? "(unset)");
  console.log("  SCE_DATA_ENVIRONMENT:", getRuntimeDataEnvironment());
  console.log("  DB fingerprint:", inventory.databaseFingerprint ?? "—");
  console.log("  Legal entity:", inventory.legalEntityKey ?? "—");
  console.log("");
  console.log("PROTECTED FCA");
  console.log("  customer:", fca.customerFound ? fca.customerKey : "MISSING");
  console.log("  contract:", fca.contractFound ? fca.contractNumber : "MISSING");
  console.log(
    "  2026-000001:",
    fca.invoiceVoid
      ? `${fca.invoiceVoid.status} (key=${fca.invoiceVoid.key})`
      : "MISSING",
  );
  console.log(
    "  2026-000002:",
    fca.invoiceActive
      ? `${fca.invoiceActive.status} (key=${fca.invoiceActive.key})`
      : "MISSING",
  );
  console.log(
    "  2026-000002 payment count:",
    fca.invoiceActive?.paymentCount ?? "—",
  );
  console.log(
    "  2026-000002 delivery state:",
    fca.invoiceActive?.deliveryStatuses.join(", ") || "—",
  );
  console.log(
    "  2026-000002 updatedAt:",
    fca.invoiceActive?.updatedAt?.toISOString() ?? "—",
  );
  console.log("");
  console.log("SYNTHETIC TARGETS");
  console.log(
    "  customer:",
    synthetic.customer
      ? `${synthetic.customer.key} (${synthetic.customer.displayName})`
      : "absent",
  );
  console.log(
    "  contract:",
    synthetic.contract
      ? `${synthetic.contract.contractNumber} (key=${synthetic.contract.key})`
      : "absent",
  );
  console.log(
    "  invoices:",
    synthetic.invoices.length
      ? synthetic.invoices
          .map((i) => `${i.invoiceNumber ?? "?"} key=${i.key} status=${i.status}`)
          .join("; ")
      : "none",
  );
  console.log("  payments:", synthetic.paymentIds.length, synthetic.paymentIds);
  console.log(
    "  payment instructions:",
    synthetic.paymentInstructionIds.length,
    synthetic.paymentInstructionIds,
  );
  console.log("  deliveries:", synthetic.deliveryIds.length, synthetic.deliveryIds);
  console.log(
    "  reconciliation imports:",
    synthetic.reconciliationImports
      .map(
        (i) =>
          `${i.filename} deletable=${i.transactionIds.length > 0 && !i.mixedImportBlocked} blocked=${i.mixedImportBlocked}`,
      )
      .join("; ") || "none",
  );
  console.log(
    "  reconciliation transactions:",
    synthetic.reconciliationTransactionIds.length,
    synthetic.reconciliationTransactionIds,
  );
  console.log("  audit rows:", synthetic.auditLogIds.length);
  console.log("  billing profiles:", synthetic.billingProfileIds.length);
  console.log("  tenant links:", synthetic.tenantLinkIds.length);
  console.log("  audit decision:", inventory.auditCleanupDecision);
  console.log("");
  console.log("INVOICE SEQUENCE (read-only, must not change on execute)");
  for (const seq of inventory.invoiceSequences) {
    console.log(
      `  year=${seq.sequenceYear} lastNumber=${seq.lastNumber} legalEntityId=${seq.legalEntityId}`,
    );
  }
  if (inventory.blockingErrors.length > 0) {
    console.log("");
    console.log("BLOCKING ERRORS");
    for (const err of inventory.blockingErrors) {
      console.log("  -", err);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = process.env;

  if (args.execute) {
    assertCleanupExecuteGuards({
      execute: true,
      confirm: args.confirm,
      env,
      databaseUrl: env.DATABASE_URL,
    });
    assertCleanupStageIdentityReadOnly(env);
  } else {
    assertCleanupStageIdentityReadOnly(env);
  }

  const inventory = await collectCleanupInventory(prisma, env);
  printReport(inventory, args.execute ? "execute" : "dry-run");

  if (inventory.legalEntityKey !== PROTECTED_LEGAL_ENTITY_KEY) {
    console.error(
      `Protected legal entity ${PROTECTED_LEGAL_ENTITY_KEY} not found — STOP.`,
    );
    process.exit(1);
  }

  if (inventory.blockingErrors.length > 0) {
    console.error("Invariant failures — no mutation performed.");
    process.exit(1);
  }

  if (!inventoryHasSyntheticTargets(inventory)) {
    console.log("");
    console.log("Nothing to clean — idempotent success.");
    process.exit(0);
  }

  if (!args.execute) {
    console.log("");
    console.log("Dry-run complete — no database writes.");
    process.exit(0);
  }

  const executeResult = await executeCleanupTransaction(prisma, inventory);
  console.log("");
  console.log("EXECUTE RESULT", JSON.stringify(executeResult.deleted, null, 2));
  console.log(
    "Invoice sequence unchanged:",
    executeResult.invoiceSequencesUnchanged ? "PASS" : "FAIL",
  );

  const post = await collectCleanupInventory(prisma, env);
  printReport(post, "execute");
  console.log("");
  console.log("POST-CLEANUP VERIFICATION");
  console.log(
    "  synthetic customer:",
    post.synthetic.customer ? "PRESENT (FAIL)" : "absent (PASS)",
  );
  console.log(
    "  synthetic contract:",
    post.synthetic.contract ? "PRESENT (FAIL)" : "absent (PASS)",
  );
  for (const num of SYNTHETIC_INVOICE_NUMBERS) {
    const found = post.synthetic.invoices.some((i) => i.invoiceNumber === num);
    console.log(`  ${num}:`, found ? "PRESENT (FAIL)" : "absent (PASS)");
  }
  console.log(
    "  FCA void invoice:",
    post.fca.invoiceVoid?.status === "VOID" ? "PASS" : "FAIL",
  );
  console.log(
    "  FCA active invoice:",
    post.fca.invoiceActive ? `PASS (${post.fca.invoiceActive.status})` : "FAIL",
  );

  if (
    post.synthetic.customer ||
    post.synthetic.contract ||
    post.synthetic.invoices.length > 0
  ) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(`[${OPERATION_ID}]`, error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
