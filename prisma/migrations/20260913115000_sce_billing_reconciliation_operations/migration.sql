-- Additive reconciliation hardening. Rollback can drop the new columns and
-- indexes; existing payment and import data remains untouched.
ALTER TYPE "InvoicePaymentRecordMethod" ADD VALUE 'BANK_TRANSFER_CAMT054';
ALTER TYPE "InvoicePaymentRecordMethod" ADD VALUE 'STRIPE_PAYMENT';
ALTER TYPE "BankReconciliationMatchMethod" ADD VALUE 'PROVIDER_TRANSACTION_ID_MISSING';
ALTER TYPE "BankReconciliationMatchMethod" ADD VALUE 'REVERSAL_REQUIRES_REVIEW';

ALTER TABLE "InvoicePayment"
  ADD COLUMN "providerTransactionId" TEXT;

UPDATE "InvoicePayment"
SET "providerTransactionId" = 'CAMT054:' || "bankTransactionId"
WHERE "source" = 'CAMT054' AND "bankTransactionId" IS NOT NULL;

CREATE UNIQUE INDEX "InvoicePayment_providerTransactionId_key"
  ON "InvoicePayment"("providerTransactionId");

ALTER TABLE "BankReconciliationImport"
  ADD COLUMN "accountMasked" TEXT,
  ADD COLUMN "bookingPeriodStart" DATE,
  ADD COLUMN "bookingPeriodEnd" DATE,
  ADD COLUMN "totalCreditsMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creditCurrency" TEXT;

ALTER TABLE "BankReconciliationTransaction"
  ADD COLUMN "bookingDate" DATE,
  ADD COLUMN "valueDate" DATE,
  ADD COLUMN "accountServiceReference" TEXT,
  ADD COLUMN "endToEndId" TEXT,
  ADD COLUMN "isReversal" BOOLEAN NOT NULL DEFAULT false;

UPDATE "BankReconciliationTransaction"
SET "bookingDate" = "paymentDate"
WHERE "bookingDate" IS NULL;

ALTER TABLE "BankReconciliationTransaction"
  ALTER COLUMN "bookingDate" SET NOT NULL;
