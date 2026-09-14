-- BILLING-COMMS-01A: Billing communication domain foundation (tenant-scoped, inbound-ready).

CREATE TYPE "BillingCommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE "BillingCommunicationChannel" AS ENUM ('EMAIL');

CREATE TYPE "BillingCommunicationStatus" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'FAILED');

CREATE TABLE "BillingCommunication" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "BillingCommunicationDirection" NOT NULL,
    "channel" "BillingCommunicationChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "BillingCommunicationStatus" NOT NULL,
    "invoiceId" TEXT,
    "billingContractId" TEXT,
    "invoiceDeliveryId" TEXT,
    "senderAddress" TEXT NOT NULL,
    "toAddresses" TEXT[],
    "ccAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bccAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerMessageId" TEXT,
    "internetMessageId" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCommunication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCommunication_key_key" ON "BillingCommunication"("key");

CREATE UNIQUE INDEX "BillingCommunication_invoiceDeliveryId_key" ON "BillingCommunication"("invoiceDeliveryId");

CREATE UNIQUE INDEX "BillingCommunication_provider_providerMessageId_key" ON "BillingCommunication"("provider", "providerMessageId");

CREATE INDEX "BillingCommunication_tenantId_createdAt_idx" ON "BillingCommunication"("tenantId", "createdAt");

CREATE INDEX "BillingCommunication_tenantId_status_idx" ON "BillingCommunication"("tenantId", "status");

CREATE INDEX "BillingCommunication_invoiceId_createdAt_idx" ON "BillingCommunication"("invoiceId", "createdAt");

CREATE INDEX "BillingCommunication_billingContractId_idx" ON "BillingCommunication"("billingContractId");

ALTER TABLE "BillingCommunication" ADD CONSTRAINT "BillingCommunication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCommunication" ADD CONSTRAINT "BillingCommunication_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCommunication" ADD CONSTRAINT "BillingCommunication_billingContractId_fkey" FOREIGN KEY ("billingContractId") REFERENCES "BillingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingCommunication" ADD CONSTRAINT "BillingCommunication_invoiceDeliveryId_fkey" FOREIGN KEY ("invoiceDeliveryId") REFERENCES "InvoiceDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
