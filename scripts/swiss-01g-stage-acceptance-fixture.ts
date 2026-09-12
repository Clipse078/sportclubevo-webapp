/**
 * SWISS-01G1 — STAGE-only synthetic billing acceptance fixture.
 *
 * Creates SCE Billing Test Club + contract SCE-TEST-01G + one finalized unpaid invoice.
 *
 * Usage:
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01g-stage-fixture:stage \
 *     npx tsx scripts/swiss-01g-stage-acceptance-fixture.ts --dry-run
 *
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01g-stage-fixture:stage \
 *     npx tsx scripts/swiss-01g-stage-acceptance-fixture.ts \
 *     --execute --confirm SCE-SWISS-01G-FIXTURE
 */

import "dotenv/config";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import { getInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-service";
import {
  createBillingContract,
  createDraftInvoiceFromContract,
  finalizeInvoice,
  updateBillingContract,
} from "@/lib/billing/native-billing-commercial-service";
import { findBillingCustomerByKey } from "@/lib/billing/native-billing-repository";
import { createBillingCustomerWithDetails } from "@/lib/billing/native-billing-service";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { getRuntimeEnvironment } from "@/lib/env";

const OPERATION_ID = "swiss-01g-stage-fixture";
const CONFIRM_TOKEN = "SCE-SWISS-01G-FIXTURE";
const CUSTOMER_KEY = "sce-billing-test-01g";
const CONTRACT_NUMBER = "SCE-TEST-01G";
const FCA_INVOICE_NUMBER = "2026-000002";
const ACTOR_EMAIL = "hello@tulip-digital.ch";
const EXPECTED_GROSS_MINOR = 21512;
const EXPECTED_NET_MINOR = 19900;
const EXPECTED_VAT_MINOR = 1612;

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

async function resolveActorUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Actor user ${ACTOR_EMAIL} not found on STAGE.`);
  }
  return user.id;
}

async function resolveIssuerLegalEntityId(prisma: PrismaClient): Promise<string> {
  const accounts = await prisma.billingBankAccount.findMany({
    where: { activeUntil: null },
    select: { legalEntityId: true },
    take: 20,
  });
  if (accounts.length === 0) {
    throw new Error("No active STAGE billing bank account found.");
  }
  const legalEntityId = accounts[0]!.legalEntityId;
  const entity = await prisma.legalEntity.findUnique({
    where: { id: legalEntityId },
    select: { id: true, status: true, legalName: true },
  });
  if (!entity || entity.status !== "ACTIVE") {
    throw new Error("Billing bank account legal entity is not active.");
  }
  return entity.id;
}

async function snapshotFcaInvoice(prisma: PrismaClient) {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: FCA_INVOICE_NUMBER },
    select: {
      id: true,
      key: true,
      status: true,
      grossTotalMinor: true,
      updatedAt: true,
      _count: { select: { payments: true } },
    },
  });
  return invoice;
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const confirm = args.find((a) => a.startsWith("--confirm="))?.split("=")[1] ??
    (args.includes("--confirm") ? args[args.indexOf("--confirm") + 1] : undefined);

  assertStageDatabaseTarget();

  try {
    const fcaBefore = await snapshotFcaInvoice(prisma);
    const legalEntityId = await resolveIssuerLegalEntityId(prisma);
    const actorUserId = await resolveActorUserId(prisma);

    const existingCustomer = await findBillingCustomerByKey(CUSTOMER_KEY);

    if (dryRun && !execute) {
      console.log(
        JSON.stringify(
          {
            stageDatabaseVerified: true,
            mode: "dry-run",
            legalEntityId,
            actorUserId,
            existingCustomerKey: existingCustomer?.key ?? null,
            fcaInvoiceSnapshot: fcaBefore,
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

    if (fcaBefore) {
      const fcaCustomer = await prisma.billingCustomer.findFirst({
        where: { displayName: { contains: "Allschwil", mode: "insensitive" } },
        select: { id: true },
      });
      if (fcaCustomer) {
        const linked = await prisma.invoice.findFirst({
          where: {
            id: fcaBefore.id,
            billingCustomerId: fcaCustomer.id,
          },
          select: { id: true },
        });
        if (linked) {
          // informational only — we never mutate this row
        }
      }
    }

    let customer = existingCustomer;
    if (!customer) {
      const created = await createBillingCustomerWithDetails({
        key: CUSTOMER_KEY,
        displayName: "SCE Billing Test Club",
        legalName: "SCE Billing Test Club",
        primaryEmail: "billing-test@example.invalid",
        defaultCurrency: "CHF",
        actorUserId,
        tenantKey: null,
        billingProfile: {
          companyOrName: "SCE Billing Test Club",
          street: "Teststrasse",
          houseNumber: "1",
          postalCode: "4000",
          city: "Basel",
          countryCode: "CH",
          invoiceEmail: "billing-test@example.invalid",
          profileType: "BILLING",
        },
      });
      customer = created.customer;
    }

    let contract = await prisma.billingContract.findFirst({
      where: {
        contractNumber: CONTRACT_NUMBER,
        legalEntityId,
        billingCustomerId: customer.id,
      },
    });

    if (!contract) {
      const profile = await prisma.billingProfile.findFirst({
        where: { billingCustomerId: customer.id, profileType: "BILLING" },
        select: { id: true },
      });
      const createdContract = await createBillingContract({
        legalEntityId,
        billingCustomerId: customer.id,
        contractNumber: CONTRACT_NUMBER,
        productName: "SportClubEvo Platform — TEST",
        monthlyNetAmountMinor: EXPECTED_NET_MINOR,
        currency: "CHF",
        vatTreatment: "STANDARD_81",
        startDate: "2026-09-01",
        paymentTermsDays: 30,
        invoiceRecipientProfileId: profile?.id ?? null,
        description: "STAGE acceptance fixture SWISS-01G (synthetic)",
        internalNote: "STAGE acceptance SWISS-01G — safe to delete after PO sign-off",
        actorUserId,
      });
      await updateBillingContract({
        contractKey: createdContract.key,
        status: "ACTIVE",
        actorUserId,
      });
      contract = await prisma.billingContract.findUnique({
        where: { id: createdContract.id },
      });
    } else if (contract.status !== "ACTIVE") {
      await updateBillingContract({
        contractKey: contract.key,
        status: "ACTIVE",
        actorUserId,
      });
    }

    let invoice = await prisma.invoice.findFirst({
      where: {
        billingContractId: contract.id,
        billingCustomerId: customer.id,
        status: { in: ["DRAFT", "FINALIZED", "OPEN", "PARTIALLY_PAID", "PAID"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invoice) {
      const draft = await createDraftInvoiceFromContract({
        billingContractId: contract.id,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        invoiceDate: "2026-09-01",
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

    let paymentInstructionCreated = false;
    let paymentInstructionReferenceType: string | null = null;
    try {
      const existingPi = await prisma.invoicePaymentInstruction.findUnique({
        where: { invoiceId: invoice.id },
        select: { referenceType: true },
      });
      if (existingPi) {
        paymentInstructionCreated = true;
        paymentInstructionReferenceType = existingPi.referenceType;
      } else {
        const pi = await createInvoicePaymentInstruction(invoice.key, actorUserId);
        paymentInstructionCreated = true;
        paymentInstructionReferenceType = pi.referenceType;
      }
    } catch (error) {
      paymentInstructionCreated = false;
      paymentInstructionReferenceType = null;
      console.error(
        "Payment instruction not created:",
        error instanceof Error ? error.message : String(error),
      );
    }

    const paymentSummary = await getInvoicePaymentSummary(invoice.key);
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

    const appBase =
      process.env.APP_BASE_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "https://sportclubevo-webapp-stage.vercel.app";

    const detailUrl = `${appBase.replace(/\/$/, "")}/dashboard/admin/commercial/billing/invoices/${invoice.key}`;

    console.log(
      JSON.stringify(
        {
          stageDatabaseVerified: true,
          syntheticCustomer: { id: customer.id, key: customer.key, name: customer.displayName },
          syntheticContract: {
            id: contract.id,
            key: contract.key,
            number: contract.contractNumber,
            status: contract.status,
          },
          syntheticInvoice: {
            id: invoice.id,
            key: invoice.key,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            grossTotalMinor: invoice.grossTotalMinor,
            paidTotalMinor: paymentSummary?.paidTotalMinor ?? 0,
            outstandingMinor: paymentSummary?.outstandingMinor ?? invoice.grossTotalMinor,
            paymentCount: paymentSummary?.payments.length ?? 0,
            detailUrl,
          },
          paymentInstruction: {
            created: paymentInstructionCreated,
            referenceType: paymentInstructionReferenceType,
          },
          fcaSafety: {
            invoice2026_000002Mutated: false,
            fcaPaymentCount: fcaAfter?._count.payments ?? null,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
