/**
 * SWISS-01H — read-only STAGE preflight (no mutations, no operation authorization).
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { getInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-service";

function hostFromDatabaseUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

function fingerprintHost(host: string | null): string | null {
  if (!host) return null;
  return `${host.slice(0, 8)}…${host.slice(-14)}`;
}

async function snapshotInvoice(invoiceNumber: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber },
    select: {
      key: true,
      status: true,
      grossTotalMinor: true,
      updatedAt: true,
      _count: { select: { payments: true } },
      billingCustomer: { select: { displayName: true } },
    },
  });
  if (!invoice) return null;
  const summary = await getInvoicePaymentSummary(invoice.key);
  return {
    key: invoice.key,
    status: invoice.status,
    paymentCount: invoice._count.payments,
    updatedAt: invoice.updatedAt.toISOString(),
    grossMinor: invoice.grossTotalMinor,
    paidMinor: summary?.paidTotalMinor ?? 0,
    outstandingMinor: summary?.outstandingMinor ?? null,
    customer: invoice.billingCustomer.displayName,
  };
}

async function main(): Promise<void> {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_ENV: process.env.APP_ENV ?? "local",
  });
  const dbHost = hostFromDatabaseUrl(process.env.DATABASE_URL);
  const stageRefHost = hostFromDatabaseUrl(process.env.STAGE_DB_URL);
  const stageDbHostMatch =
    Boolean(dbHost && stageRefHost) &&
    dbHost!.toLowerCase() === stageRefHost!.toLowerCase();

  console.log(
    JSON.stringify(
      {
        appEnv: runtime.appEnv,
        isStage: runtime.isStage,
        databaseHostFingerprint: fingerprintHost(dbHost),
        stageReferenceHostFingerprint: fingerprintHost(stageRefHost),
        stageDbHostMatch,
        stageTargetProven: runtime.isStage && stageDbHostMatch,
        billingEncryptionKeyConfigured: Boolean(
          process.env.SCE_BILLING_ENCRYPTION_KEY?.trim(),
        ),
        fca2026_000002: await snapshotInvoice("2026-000002"),
        synthetic2026_000003: await snapshotInvoice("2026-000003"),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));
