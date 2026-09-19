-- BILLING-COMMS-01E — Billing communication attachments

CREATE TYPE "BillingCommunicationAttachmentLifecycleStatus" AS ENUM ('STAGED', 'READY');

CREATE TABLE "BillingCommunicationAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "billingCommunicationId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "sanitizedFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "contentDisposition" TEXT,
    "providerContentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lifecycleStatus" "BillingCommunicationAttachmentLifecycleStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCommunicationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingInboundUnresolvedAttachment" (
    "id" TEXT NOT NULL,
    "unresolvedMessageId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "sanitizedFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "contentDisposition" TEXT,
    "providerContentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInboundUnresolvedAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCommunicationAttachment_storageKey_key" ON "BillingCommunicationAttachment"("storageKey");

CREATE INDEX "BillingCommunicationAttachment_tenantId_invoiceId_idx" ON "BillingCommunicationAttachment"("tenantId", "invoiceId");

CREATE INDEX "BillingCommunicationAttachment_tenantId_billingCommunicationId_sortOrder_idx" ON "BillingCommunicationAttachment"("tenantId", "billingCommunicationId", "sortOrder");

CREATE INDEX "BillingCommunicationAttachment_billingCommunicationId_idx" ON "BillingCommunicationAttachment"("billingCommunicationId");

CREATE UNIQUE INDEX "BillingInboundUnresolvedAttachment_storageKey_key" ON "BillingInboundUnresolvedAttachment"("storageKey");

CREATE UNIQUE INDEX "BillingInboundUnresolvedAttachment_unresolvedMessageId_providerContentId_key" ON "BillingInboundUnresolvedAttachment"("unresolvedMessageId", "providerContentId");

CREATE INDEX "BillingInboundUnresolvedAttachment_unresolvedMessageId_sortOrder_idx" ON "BillingInboundUnresolvedAttachment"("unresolvedMessageId", "sortOrder");

ALTER TABLE "BillingCommunicationAttachment" ADD CONSTRAINT "BillingCommunicationAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCommunicationAttachment" ADD CONSTRAINT "BillingCommunicationAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCommunicationAttachment" ADD CONSTRAINT "BillingCommunicationAttachment_billingCommunicationId_fkey" FOREIGN KEY ("billingCommunicationId") REFERENCES "BillingCommunication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingInboundUnresolvedAttachment" ADD CONSTRAINT "BillingInboundUnresolvedAttachment_unresolvedMessageId_fkey" FOREIGN KEY ("unresolvedMessageId") REFERENCES "BillingInboundUnresolvedMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
