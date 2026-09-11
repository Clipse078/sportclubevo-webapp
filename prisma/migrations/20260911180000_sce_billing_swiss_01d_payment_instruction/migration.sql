-- SCE-BILLING-SWISS-01D — Swiss QR payment instruction engine

CREATE TYPE "InvoicePaymentMethod" AS ENUM ('BANK_TRANSFER_SWISS_QR');

ALTER TABLE "BillingBankAccount" ADD COLUMN "qrrReferencePrefix" TEXT;

CREATE TABLE "InvoicePaymentInstruction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "billingBankAccountId" TEXT NOT NULL,
    "paymentMethod" "InvoicePaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER_SWISS_QR',
    "referenceType" "BillingReferenceStrategy" NOT NULL,
    "reference" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "creditorAccountMasked" TEXT NOT NULL,
    "additionalInformation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePaymentInstruction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoicePaymentInstruction_invoiceId_key" ON "InvoicePaymentInstruction"("invoiceId");

CREATE INDEX "InvoicePaymentInstruction_billingBankAccountId_idx" ON "InvoicePaymentInstruction"("billingBankAccountId");

ALTER TABLE "InvoicePaymentInstruction" ADD CONSTRAINT "InvoicePaymentInstruction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoicePaymentInstruction" ADD CONSTRAINT "InvoicePaymentInstruction_billingBankAccountId_fkey" FOREIGN KEY ("billingBankAccountId") REFERENCES "BillingBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
