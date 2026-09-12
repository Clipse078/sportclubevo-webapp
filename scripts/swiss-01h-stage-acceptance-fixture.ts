/**
 * SWISS-01H2 — STAGE synthetic invoice + payment instruction for camt.054 PO acceptance.
 *
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01h-stage-acceptance:stage \
 *     npx tsx scripts/swiss-01h-stage-acceptance-fixture.ts --dry-run
 *
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01h-stage-acceptance:stage \
 *     npx tsx scripts/swiss-01h-stage-acceptance-fixture.ts \
 *     --execute --confirm SCE-SWISS-01H-ACCEPTANCE
 */

import "dotenv/config";
import { execFileSync } from "node:child_process";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import { formatPaymentReferenceDisplay } from "@/lib/billing/invoice-payment-instruction-serializers";
import { getInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-service";
import {
  createDraftInvoiceFromContract,
  finalizeInvoice,
} from "@/lib/billing/native-billing-commercial-service";
import { findBillingCustomerByKey } from "@/lib/billing/native-billing-repository";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { getRuntimeEnvironment } from "@/lib/env";

const OPERATION_ID = "swiss-01h-stage-acceptance";
const CONFIRM_TOKEN = "SCE-SWISS-01H-ACCEPTANCE";
const CUSTOMER_KEY = "sce-billing-test-01g";
const CONTRACT_NUMBER = "SCE-TEST-01G";
const FCA_INVOICE_NUMBER = "2026-000002";
const LEGACY_SYNTHETIC_INVOICE_NUMBER = "2026-000003";
const ACTOR_EMAIL = "hello@tulip-digital.ch";
const EXPECTED_GROSS_MINOR = 21512;
const EXPECTED_NET_MINOR = 19900;
const EXPECTED_VAT_MINOR = 1612;
const ACCEPTANCE_PERIOD_START = "2026-10-01";
const ACCEPTANCE_PERIOD_END = "2026-10-31";

function hostFromDatabaseUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

function assertStageDatabaseTarget(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_ENV: process.env.APP_ENV ?? "local",
  });

  if (!runtime.isStage) {
    throw new Error(
      `STAGE verification failed: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
  }

  const dbHost = hostFromDatabaseUrl(process.env.DATABASE_URL);
  const stageRefHost = hostFromDatabaseUrl(process.env.STAGE_DB_URL);
  if (!dbHost || !stageRefHost) {
    throw new Error(
      "STAGE verification failed: DATABASE_URL and STAGE_DB_URL hosts are required for positive identification.",
    );
  }
  if (dbHost.toLowerCase() !== stageRefHost.toLowerCase()) {
    throw new Error(
      "STAGE verification failed: DATABASE_URL host does not match STAGE_DB_URL reference host.",
    );
  }

  assertOperationalMutationAllowed({
    operationId: OPERATION_ID,
    databaseUrl: process.env.DATABASE_URL,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

async function resolveActorUserId(client: PrismaClient): Promise<string> {
  const user = await client.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Actor user ${ACTOR_EMAIL} not found on STAGE.`);
  }
  return user.id;
}

async function snapshotFcaInvoice(client: PrismaClient) {
  return client.invoice.findFirst({
    where: { invoiceNumber: FCA_INVOICE_NUMBER },
    select: {
      id: true,
      status: true,
      grossTotalMinor: true,
      updatedAt: true,
      _count: { select: { payments: true } },
    },
  });
}

function qrrValid(reference: string | null | undefined): boolean {
  return Boolean(reference && /^\d{27}$/.test(reference));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const confirm = args.find((a) => a.startsWith("--confirm="))?.split("=")[1] ??
    (args.includes("--confirm") ? args[args.indexOf("--confirm") + 1] : undefined);

  assertStageDatabaseTarget();

  const fcaBefore = await snapshotFcaInvoice(prisma);
  const actorUserId = await resolveActorUserId(prisma);
  const encryptionKeyConfigured = Boolean(process.env.SCE_BILLING_ENCRYPTION_KEY?.trim());

  const customer = await findBillingCustomerByKey(CUSTOMER_KEY);
  if (!customer) {
    throw new Error(
      `Synthetic customer ${CUSTOMER_KEY} not found — run SWISS-01G fixture first.`,
    );
  }

  const contract = await prisma.billingContract.findFirst({
    where: {
      contractNumber: CONTRACT_NUMBER,
      billingCustomerId: customer.id,
    },
  });
  if (!contract) {
    throw new Error(`Contract ${CONTRACT_NUMBER} not found for ${CUSTOMER_KEY}.`);
  }

  let invoice = await prisma.invoice.findFirst({
    where: {
      billingContractId: contract.id,
      periodStart: new Date(ACCEPTANCE_PERIOD_START),
      periodEnd: new Date(ACCEPTANCE_PERIOD_END),
    },
    orderBy: { createdAt: "desc" },
  });

  if (dryRun && !execute) {
    console.log(
      JSON.stringify(
        {
          stageDatabaseVerified: true,
          mode: "dry-run",
          encryptionKeyConfigured,
          existingAcceptanceInvoice: invoice
            ? {
                key: invoice.key,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
              }
            : null,
          fcaInvoiceSnapshot: fcaBefore,
          legacySynthetic2026_000003Untouched: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (confirm !== CONFIRM_TOKEN) {
    throw new Error(`--execute requires --confirm ${CONFIRM_TOKEN}`);
  }

  if (!invoice) {
    const draft = await createDraftInvoiceFromContract({
      billingContractId: contract.id,
      periodStart: ACCEPTANCE_PERIOD_START,
      periodEnd: ACCEPTANCE_PERIOD_END,
      invoiceDate: ACCEPTANCE_PERIOD_START,
      actorUserId,
    });
    invoice = await prisma.invoice.findUnique({ where: { id: draft.id } });
  }

  if (!invoice) {
    throw new Error("Invoice creation failed.");
  }

  if (invoice.status === "DRAFT") {
    if (
      invoice.netTotalMinor !== EXPECTED_NET_MINOR ||
      invoice.vatTotalMinor !== EXPECTED_VAT_MINOR ||
      invoice.grossTotalMinor !== EXPECTED_GROSS_MINOR
    ) {
      throw new Error(
        `Invoice totals mismatch: expected ${EXPECTED_NET_MINOR}/${EXPECTED_VAT_MINOR}/${EXPECTED_GROSS_MINOR}, got ${invoice.netTotalMinor}/${invoice.vatTotalMinor}/${invoice.grossTotalMinor}`,
      );
    }
    invoice = await finalizeInvoice(invoice.key, actorUserId);
  }

  if (invoice.status !== "FINALIZED") {
    throw new Error(
      `Acceptance invoice must be FINALIZED (got ${invoice.status}). Do not mutate ${LEGACY_SYNTHETIC_INVOICE_NUMBER}.`,
    );
  }

  const paymentSummaryBefore = await getInvoicePaymentSummary(invoice.key);

  let paymentInstructionStatus: "CREATED" | "EXISTING" | "BLOCKED_ENCRYPTION" | "BLOCKED_ERROR" =
    "BLOCKED_ENCRYPTION";
  let paymentInstructionError: string | null = null;
  let instruction = await prisma.invoicePaymentInstruction.findUnique({
    where: { invoiceId: invoice.id },
  });

  if (instruction) {
    paymentInstructionStatus = "EXISTING";
  } else if (!encryptionKeyConfigured) {
    paymentInstructionStatus = "BLOCKED_ENCRYPTION";
    paymentInstructionError =
      "SCE_BILLING_ENCRYPTION_KEY is not available in this environment.";
  } else {
    try {
      const created = await createInvoicePaymentInstruction(invoice.key, actorUserId);
      instruction = await prisma.invoicePaymentInstruction.findUnique({
        where: { id: created.id },
      });
      paymentInstructionStatus = instruction ? "CREATED" : "BLOCKED_ERROR";
    } catch (error) {
      paymentInstructionStatus = "BLOCKED_ERROR";
      paymentInstructionError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const paymentSummaryAfter = await getInvoicePaymentSummary(invoice.key);
  const fcaAfter = await snapshotFcaInvoice(prisma);

  if (fcaBefore && fcaAfter) {
    const unchanged =
      fcaBefore.status === fcaAfter.status &&
      fcaBefore.grossTotalMinor === fcaAfter.grossTotalMinor &&
      fcaBefore._count.payments === fcaAfter._count.payments &&
      fcaBefore.updatedAt.getTime() === fcaAfter.updatedAt.getTime();
    if (!unchanged) {
      throw new Error("FCA invoice 2026-000002 changed during fixture run — aborting.");
    }
  }

  let fixturesGenerated = false;
  if (invoice.invoiceNumber) {
    try {
      execFileSync(
        "npx",
        [
          "tsx",
          "scripts/swiss-01h-generate-camt054-acceptance-fixtures.ts",
          "--invoice-number",
          invoice.invoiceNumber,
        ],
        { stdio: "pipe", encoding: "utf8", cwd: process.cwd() },
      );
      fixturesGenerated = true;
    } catch {
      fixturesGenerated = false;
    }
  }

  const qrrDisplay =
    instruction?.reference && instruction.referenceType === "QRR"
      ? formatPaymentReferenceDisplay("QRR", instruction.reference)
      : null;

  const appBase =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://sportclubevo-webapp-stage.vercel.app";
  const base = appBase.replace(/\/$/, "");

  console.log(
    JSON.stringify(
      {
        stageDatabaseVerified: true,
        syntheticInvoice: {
          key: invoice.key,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          grossTotalMinor: invoice.grossTotalMinor,
          paidTotalMinor: paymentSummaryAfter?.paidTotalMinor ?? 0,
          outstandingMinor: paymentSummaryAfter?.outstandingMinor ?? invoice.grossTotalMinor,
          paymentCount: paymentSummaryAfter?.payments.length ?? 0,
          detailUrl: `${base}/dashboard/admin/commercial/billing/invoices/${invoice.key}`,
        },
        paymentInstruction: {
          status: paymentInstructionStatus,
          referenceType: instruction?.referenceType ?? null,
          paymentMethod: instruction?.paymentMethod ?? null,
          amountMinor: instruction?.amountMinor ?? null,
          qrrValid: qrrValid(instruction?.reference),
          qrrOperationalDisplay: qrrDisplay,
          creditorAccountMasked: instruction?.creditorAccountMasked ?? null,
          error: paymentInstructionError,
          poUiActionWhenBlocked:
            paymentInstructionStatus === "BLOCKED_ENCRYPTION"
              ? "Commercial → Billing → open the new synthetic invoice → Zahlungsanweisung / Swiss QR → «Zahlungsanweisung erstellen» (requires STAGE SCE_BILLING_ENCRYPTION_KEY on the server)."
              : null,
        },
        dryRunSafety: {
          paymentCountBefore: paymentSummaryBefore?.payments.length ?? 0,
          paymentCountAfter: paymentSummaryAfter?.payments.length ?? 0,
          outstandingBefore: paymentSummaryBefore?.outstandingMinor ?? null,
          outstandingAfter: paymentSummaryAfter?.outstandingMinor ?? null,
        },
        acceptanceFixturesGenerated: fixturesGenerated,
        reconciliationUrl: `${base}/dashboard/admin/commercial/billing/reconciliation`,
        fcaSafety: {
          invoice2026_000002Mutated: false,
          fcaPaymentCount: fcaAfter?._count.payments ?? null,
        },
        legacySynthetic2026_000003: { doNotModify: true },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
