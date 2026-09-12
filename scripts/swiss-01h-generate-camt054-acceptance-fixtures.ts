/**
 * Generate SWISS-01H synthetic camt.054 acceptance XML from a STAGE invoice payment instruction.
 *
 *   npx tsx scripts/swiss-01h-generate-camt054-acceptance-fixtures.ts \
 *     --invoice-number 2026-000004
 */

import "dotenv/config";

import { writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { buildSyntheticCamt054Xml } from "@/lib/billing/camt054/__tests__/fixtures/acceptance/camt054-fixture-template";
import { generateQrrReference } from "@/lib/billing/swiss-qr/swiss-qrr";

const ACCEPTANCE_DIR = path.join(
  process.cwd(),
  "lib/billing/camt054/__tests__/fixtures/acceptance",
);

const UNKNOWN_QRR_SYNTHETIC = "21000000000313943014314517";

function parseInvoiceNumber(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--invoice-number") {
      return argv[i + 1]?.trim() ?? "";
    }
  }
  return "";
}

function assertQrr(reference: string): void {
  if (!/^\d{27}$/.test(reference)) {
    throw new Error(`QRR must be exactly 27 numeric digits (got length ${reference.length}).`);
  }
}

async function resolveOperationalQrr(invoice: {
  id: string;
  legalEntityId: string;
  invoiceNumber: string | null;
  paymentInstruction: { reference: string | null; referenceType: string } | null;
}): Promise<string> {
  if (
    invoice.paymentInstruction?.referenceType === "QRR" &&
    invoice.paymentInstruction.reference
  ) {
    return invoice.paymentInstruction.reference;
  }

  const bankAccount = await prisma.billingBankAccount.findFirst({
    where: { legalEntityId: invoice.legalEntityId, activeUntil: null },
    select: { qrrReferencePrefix: true, referenceStrategy: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (bankAccount?.referenceStrategy !== "QRR") {
    throw new Error("Active billing bank account is not configured for QRR.");
  }
  if (!invoice.invoiceNumber) {
    throw new Error("Invoice has no invoice number.");
  }
  return generateQrrReference(
    {
      invoiceId: invoice.id,
      legalEntityId: invoice.legalEntityId,
      invoiceNumber: invoice.invoiceNumber,
    },
    bankAccount.qrrReferencePrefix,
  );
}

function writeFixture(filename: string, xml: string): void {
  writeFileSync(path.join(ACCEPTANCE_DIR, filename), `${xml.trim()}\n`, "utf8");
}

async function main(): Promise<void> {
  const invoiceNumber = parseInvoiceNumber(process.argv.slice(2));
  if (!invoiceNumber) {
    throw new Error("--invoice-number is required.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber },
    include: {
      paymentInstruction: {
        select: { reference: true, referenceType: true },
      },
      billingCustomer: { select: { displayName: true } },
    },
  });
  if (!invoice) {
    throw new Error(`Invoice ${invoiceNumber} not found.`);
  }

  const qrr = await resolveOperationalQrr(invoice);
  assertQrr(qrr);

  const debtorName = invoice.billingCustomer.displayName;
  const bookingDate = "2026-09-12";

  writeFixture(
    "a-exact-qrr-full.camt054.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Synthetic SWISS-01H acceptance: exact QRR full payment for ${invoiceNumber} -->\n${buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-A",
      bankTransactionId: "SCE-01H-TX-A-FULL",
      amountMajor: "215.12",
      currency: "CHF",
      bookingDate,
      qrrReference: qrr,
      debtorName,
    })}`,
  );

  writeFixture(
    "b-partial-qrr.camt054.xml",
    buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-B",
      bankTransactionId: "SCE-01H-TX-B-PARTIAL",
      amountMajor: "100.00",
      currency: "CHF",
      bookingDate,
      qrrReference: qrr,
    }),
  );

  writeFixture(
    "c-unknown-qrr.camt054.xml",
    buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-C",
      bankTransactionId: "SCE-01H-TX-C-UNKNOWN",
      amountMajor: "50.00",
      currency: "CHF",
      bookingDate,
      qrrReference: UNKNOWN_QRR_SYNTHETIC,
    }),
  );

  writeFixture(
    "d-duplicate-bank-tx.camt054.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Duplicate AcctSvcrRef of fixture A after A has been booked -->\n${buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-D",
      bankTransactionId: "SCE-01H-TX-A-FULL",
      amountMajor: "215.12",
      currency: "CHF",
      bookingDate,
      qrrReference: qrr,
    })}`,
  );

  writeFixture(
    "e-overpayment.camt054.xml",
    buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-E",
      bankTransactionId: "SCE-01H-TX-E-OVER",
      amountMajor: "250.00",
      currency: "CHF",
      bookingDate,
      qrrReference: qrr,
    }),
  );

  writeFixture(
    "f-already-paid.camt054.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Use after invoice ${invoiceNumber} is fully PAID -->\n${buildSyntheticCamt054Xml({
      messageId: "SCE-01H-ACC-F",
      bankTransactionId: "SCE-01H-TX-F-PAID",
      amountMajor: "215.12",
      currency: "CHF",
      bookingDate,
      qrrReference: qrr,
    })}`,
  );

  console.log(
    JSON.stringify(
      {
        invoiceNumber,
        invoiceKey: invoice.key,
        qrrDigitCount: qrr.length,
        qrrValid: /^\d{27}$/.test(qrr),
        qrrSource:
          invoice.paymentInstruction?.referenceType === "QRR" &&
          invoice.paymentInstruction.reference
            ? "payment_instruction"
            : "computed_before_pi_row",
        fixturesWritten: [
          "a-exact-qrr-full.camt054.xml",
          "b-partial-qrr.camt054.xml",
          "c-unknown-qrr.camt054.xml",
          "d-duplicate-bank-tx.camt054.xml",
          "e-overpayment.camt054.xml",
          "f-already-paid.camt054.xml",
        ],
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
