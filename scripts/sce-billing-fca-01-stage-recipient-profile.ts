/**
 * SCE-BILLING-FCA-01 — Link FC Allschwil contract to canonical invoice recipient profile (STAGE).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     npx tsx scripts/sce-billing-fca-01-stage-recipient-profile.ts --dry-run
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     SCE_OPERATION_AUTHORIZATION=sce-billing-fca-01-recipient-profile:stage \
 *     npx tsx scripts/sce-billing-fca-01-stage-recipient-profile.ts \
 *     --execute --confirm SCE-BILLING-FCA-01-RECIPIENT-PROFILE
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { buildBillingAttentionQueue } from "@/lib/billing/operations/billing-operations-attention";
import {
  assertFcaLinkageExecuteAuthorized,
  assertFcaLinkageStageIdentityReadOnly,
  collectFcaRecipientLinkageInventory,
  executeFcaRecipientProfileLinkage,
  expectedOperationAuthorization,
  FCA_CANONICAL_RECIPIENT_SPEC,
  loadFcaActiveInvoiceIntegritySnapshot,
  OPERATION_ID,
} from "@/lib/billing/sce-billing-fca-01-recipient-profile-linkage";
import { getRuntimeDataEnvironment } from "@/lib/server/runtime-identity";

const ACTOR_EMAIL = "hello@tulip-digital.ch";

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

async function resolveActorUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Actor user ${ACTOR_EMAIL} not found on STAGE.`);
  }
  return user.id;
}

function maskId(id: string): string {
  if (id.length <= 8) return "***";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

async function attentionHasMissingRecipientProfile(contractKey: string): Promise<boolean> {
  const customer = await prisma.billingCustomer.findUnique({
    where: { key: "fca-0001" },
    select: { id: true, key: true, displayName: true },
  });
  const contract = await prisma.billingContract.findUnique({
    where: { key: contractKey },
    select: {
      key: true,
      contractNumber: true,
      status: true,
      invoiceRecipientProfileId: true,
      billingCustomer: { select: { key: true, displayName: true } },
    },
  });
  if (!customer || !contract) return false;

  const queue = buildBillingAttentionQueue({
    referenceDate: new Date(),
    customerKeyById: new Map([[customer.id, customer.key]]),
    customerNameById: new Map([[customer.id, customer.displayName]]),
    invoices: [],
    customers: [],
    contracts: [
      {
        key: contract.key,
        contractNumber: contract.contractNumber,
        customerKey: contract.billingCustomer.key,
        customerName: contract.billingCustomer.displayName,
        status: contract.status,
        invoiceRecipientProfileId: contract.invoiceRecipientProfileId,
      },
    ],
    reconciliationTransactions: [],
  });

  return queue.some(
    (item) =>
      item.kind === "CONTRACT_CONFIGURATION" &&
      item.contractKey === contractKey &&
      item.reason === "Aktiver Vertrag ohne Rechnungsempfänger-Profil",
  );
}

async function main() {
  const { dryRun, execute, confirm } = parseArgs(process.argv.slice(2));

  assertFcaLinkageStageIdentityReadOnly();
  const inventory = await collectFcaRecipientLinkageInventory(prisma);
  const warningBefore = await attentionHasMissingRecipientProfile(inventory.contractKey);

  if (dryRun && !execute) {
    console.log(
      JSON.stringify(
        {
          operationId: OPERATION_ID,
          mode: "dry-run",
          dataEnvironment: getRuntimeDataEnvironment(),
          expectedAuthorization: expectedOperationAuthorization(process.env),
          customerKey: inventory.customerKey,
          contractNumber: inventory.contractNumber,
          contractKey: inventory.contractKey,
          invoiceRecipientProfileIdBefore: inventory.invoiceRecipientProfileIdBefore
            ? maskId(inventory.invoiceRecipientProfileIdBefore)
            : null,
          canonicalProfileId: inventory.canonicalProfileId
            ? maskId(inventory.canonicalProfileId)
            : null,
          profileCount: inventory.profiles.length,
          canonicalRecipientSpec: FCA_CANONICAL_RECIPIENT_SPEC,
          invoiceIntegrity: inventory.invoiceIntegrity,
          dashboardMissingRecipientWarning: warningBefore,
        },
        null,
        2,
      ),
    );
    return;
  }

  assertFcaLinkageExecuteAuthorized({ execute, confirm });
  const actorUserId = await resolveActorUserId();
  const result = await executeFcaRecipientProfileLinkage(prisma, { actorUserId });
  const warningAfter = await attentionHasMissingRecipientProfile(inventory.contractKey);

  console.log(
    JSON.stringify(
      {
        operationId: OPERATION_ID,
        mode: "execute",
        profileId: maskId(result.profileId),
        profileReused: result.profileReused,
        contractLinked: result.contractLinked,
        invoiceRecipientProfileIdBefore: result.inventory.invoiceRecipientProfileIdBefore
          ? maskId(result.inventory.invoiceRecipientProfileIdBefore)
          : null,
        invoiceRecipientProfileIdAfter: maskId(result.invoiceRecipientProfileIdAfter),
        invoiceIntegrityUnchanged: result.invoiceIntegrityUnchanged,
        defaultLanguageUpdated: result.defaultLanguageUpdated,
        dashboardMissingRecipientWarningBefore: warningBefore,
        dashboardMissingRecipientWarningAfter: warningAfter,
        invoiceIntegrity: await loadFcaActiveInvoiceIntegritySnapshot(prisma),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
