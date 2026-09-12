-- CreateEnum
CREATE TYPE "InvoicePaymentRecordMethod" AS ENUM ('BANK_TRANSFER_MANUAL');

-- CreateEnum
CREATE TYPE "InvoicePaymentSource" AS ENUM ('MANUAL', 'CAMT054', 'STRIPE');

-- CreateEnum
CREATE TYPE "InvoicePaymentRecordStatus" AS ENUM ('CONFIRMED', 'REVERSED');

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "InvoicePaymentRecordMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "source" "InvoicePaymentSource" NOT NULL,
    "status" "InvoicePaymentRecordStatus" NOT NULL DEFAULT 'CONFIRMED',
    "externalReference" TEXT,
    "bankTransactionId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePayment_key_key" ON "InvoicePayment"("key");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_paymentDate_idx" ON "InvoicePayment"("invoiceId", "paymentDate");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_status_idx" ON "InvoicePayment"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "InvoicePayment_status_idx" ON "InvoicePayment"("status");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
