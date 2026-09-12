-- SCE-BILLING-SWISS-01F: Native invoice email delivery attempts (transport metadata only).

CREATE TYPE "InvoiceDeliveryChannel" AS ENUM ('EMAIL');

CREATE TYPE "InvoiceDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

CREATE TABLE "InvoiceDelivery" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "channel" "InvoiceDeliveryChannel" NOT NULL DEFAULT 'EMAIL',
    "recipientEmail" TEXT NOT NULL,
    "status" "InvoiceDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "subjectSnapshot" TEXT,
    "fromAddressSnapshot" TEXT,
    "replyToSnapshot" TEXT,
    "attachmentFilename" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceDelivery_key_key" ON "InvoiceDelivery"("key");

CREATE INDEX "InvoiceDelivery_invoiceId_attemptNumber_idx" ON "InvoiceDelivery"("invoiceId", "attemptNumber");

CREATE INDEX "InvoiceDelivery_invoiceId_createdAt_idx" ON "InvoiceDelivery"("invoiceId", "createdAt");

CREATE INDEX "InvoiceDelivery_status_idx" ON "InvoiceDelivery"("status");

CREATE UNIQUE INDEX "InvoiceDelivery_invoiceId_sending_unique" ON "InvoiceDelivery"("invoiceId") WHERE "status" = 'SENDING';

ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
