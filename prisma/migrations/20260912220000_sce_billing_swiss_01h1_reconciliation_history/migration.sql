-- SCE-BILLING-SWISS-01H1 — persistent bank reconciliation import history.

CREATE TYPE "BankReconciliationImportSource" AS ENUM ('CAMT054');

CREATE TYPE "BankReconciliationImportStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'FAILED');

CREATE TYPE "BankReconciliationMatchStatus" AS ENUM (
  'MATCHED',
  'UNMATCHED',
  'REVIEW_REQUIRED',
  'DUPLICATE',
  'ERROR'
);

CREATE TYPE "BankReconciliationMatchMethod" AS ENUM (
  'QRR_EXACT',
  'QRR_NOT_FOUND',
  'MANUAL_ASSIGNMENT',
  'AMOUNT_EXCEEDS_OUTSTANDING',
  'CURRENCY_MISMATCH',
  'INVOICE_ALREADY_PAID',
  'DUPLICATE_TRANSACTION',
  'UNSUPPORTED_REFERENCE',
  'NO_REFERENCE',
  'REJECTED_ENTRY',
  'WRONG_LEGAL_ENTITY',
  'NOT_PAYABLE',
  'PARSE_ERROR'
);

CREATE TABLE "BankReconciliationImport" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "source" "BankReconciliationImportSource" NOT NULL DEFAULT 'CAMT054',
  "filename" TEXT NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "camtMessageId" TEXT,
  "status" "BankReconciliationImportStatus" NOT NULL,
  "transactionCount" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
  "reviewRequiredCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedByUserId" TEXT,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "BankReconciliationImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankReconciliationTransaction" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "bankTransactionId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "paymentDate" DATE NOT NULL,
  "creditorReference" TEXT,
  "referenceType" TEXT,
  "debtorName" TEXT,
  "matchStatus" "BankReconciliationMatchStatus" NOT NULL,
  "matchMethod" "BankReconciliationMatchMethod",
  "matchReason" TEXT,
  "invoiceId" TEXT,
  "invoicePaymentInstructionId" TEXT,
  "invoicePaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankReconciliationTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankReconciliationImport_key_key" ON "BankReconciliationImport"("key");
CREATE UNIQUE INDEX "BankReconciliationImport_legalEntityId_contentSha256_key" ON "BankReconciliationImport"("legalEntityId", "contentSha256");
CREATE INDEX "BankReconciliationImport_legalEntityId_uploadedAt_idx" ON "BankReconciliationImport"("legalEntityId", "uploadedAt");

CREATE UNIQUE INDEX "BankReconciliationTransaction_key_key" ON "BankReconciliationTransaction"("key");
CREATE UNIQUE INDEX "BankReconciliationTransaction_importId_bankTransactionId_key" ON "BankReconciliationTransaction"("importId", "bankTransactionId");
CREATE INDEX "BankReconciliationTransaction_importId_matchStatus_idx" ON "BankReconciliationTransaction"("importId", "matchStatus");
CREATE INDEX "BankReconciliationTransaction_bankTransactionId_idx" ON "BankReconciliationTransaction"("bankTransactionId");

ALTER TABLE "BankReconciliationImport"
  ADD CONSTRAINT "BankReconciliationImport_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BankReconciliationTransaction"
  ADD CONSTRAINT "BankReconciliationTransaction_importId_fkey"
  FOREIGN KEY ("importId") REFERENCES "BankReconciliationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankReconciliationTransaction"
  ADD CONSTRAINT "BankReconciliationTransaction_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankReconciliationTransaction"
  ADD CONSTRAINT "BankReconciliationTransaction_invoicePaymentId_fkey"
  FOREIGN KEY ("invoicePaymentId") REFERENCES "InvoicePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
