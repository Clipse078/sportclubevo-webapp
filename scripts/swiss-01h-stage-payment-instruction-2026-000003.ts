/**
 * SWISS-01H1 — ensure payment instruction for acceptance invoice 2026-000003 (dry-run default).
 *
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01h-payment-instruction:stage \
 *     npx tsx scripts/swiss-01h-stage-payment-instruction-2026-000003.ts --dry-run
 *
 *   ... --execute --confirm SCE-SWISS-01H-PI-2026-000003
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { createInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import { formatPaymentReferenceDisplay } from "@/lib/billing/invoice-payment-instruction-serializers";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { getRuntimeEnvironment } from "@/lib/env";

const OPERATION_ID = "swiss-01h-payment-instruction";
const CONFIRM_TOKEN = "SCE-SWISS-01H-PI-2026-000003";
const INVOICE_NUMBER = "2026-000003";
const INVOICE_KEY = "inv-sce-test-01g";
const FCA_INVOICE_NUMBER = "2026-000002";
const ACTOR_EMAIL = "hello@tulip-digital.ch";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let execute = false;
  let confirm: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    if (arg === "--execute") execute = true;
    if (arg === "--confirm") confirm = argv[++i] ?? null;
  }
  return { dryRun, execute, confirm };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun === args.execute) {
    throw new Error("Specify exactly one of --dry-run or --execute.");
  }
  if (args.execute) {
    if (args.confirm !== CONFIRM_TOKEN) {
      throw new Error(`Execute requires --confirm ${CONFIRM_TOKEN}`);
    }
    const runtime = getRuntimeEnvironment({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
      APP_ENV: process.env.APP_ENV ?? "local",
    });
    if (!runtime.isStage) {
      throw new Error('APP_ENV must be "stage" for execute.');
    }
    assertOperationalMutationAllowed({
      operationId: OPERATION_ID,
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  const actor = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!actor) {
    throw new Error(`Actor ${ACTOR_EMAIL} not found.`);
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ invoiceNumber: INVOICE_NUMBER }, { key: INVOICE_KEY }],
    },
    include: {
      billingCustomer: { select: { displayName: true, key: true } },
      paymentInstruction: true,
    },
  });
  if (!invoice) {
    throw new Error(`Invoice ${INVOICE_NUMBER} not found.`);
  }
  if (invoice.billingCustomer.key === "fca" || invoice.invoiceNumber === FCA_INVOICE_NUMBER) {
    throw new Error("FCA invoice must not be touched.");
  }

  const fca = await prisma.invoice.findFirst({
    where: { invoiceNumber: FCA_INVOICE_NUMBER },
    select: { status: true, updatedAt: true, _count: { select: { payments: true } } },
  });

  let instruction = invoice.paymentInstruction;
  let status: "CREATED" | "EXISTING" | "MISSING" | "BLOCKED" = instruction
    ? "EXISTING"
    : "MISSING";

  if (!instruction && args.execute) {
    await createInvoicePaymentInstruction(invoice.key, actor.id);
    instruction = await prisma.invoicePaymentInstruction.findUnique({
      where: { invoiceId: invoice.id },
    });
    status = instruction ? "CREATED" : "BLOCKED";
  } else if (!instruction && args.dryRun) {
    status = "MISSING";
  }

  const qrrDisplay =
    instruction?.reference && instruction.referenceType === "QRR"
      ? formatPaymentReferenceDisplay("QRR", instruction.reference)
      : null;

  console.log(
    JSON.stringify(
      {
        invoice: {
          key: invoice.key,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.billingCustomer.displayName,
        },
        paymentInstruction: {
          status,
          referenceType: instruction?.referenceType ?? null,
          qrrOperationalDisplay: qrrDisplay,
        },
        fcaSafety: {
          invoice2026_000002Observed: fca?.status ?? null,
          fcaPaymentCount: fca?._count.payments ?? null,
        },
        dryRun: args.dryRun,
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
