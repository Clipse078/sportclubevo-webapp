-- BILLING-COMMS-01B: Inbound billing mail ingestion (IMAP cursor, unresolved queue, threading).

CREATE TYPE "BillingInboundUnresolvedReason" AS ENUM (
    'UNKNOWN_TENANT',
    'PARSE_FAILED',
    'AMBIGUOUS_INVOICE_REFERENCE',
    'IDEMPOTENCY_CONFLICT'
);

ALTER TABLE "BillingCommunication" ADD COLUMN "parentCommunicationId" TEXT;

CREATE INDEX "BillingCommunication_internetMessageId_idx" ON "BillingCommunication"("internetMessageId");

CREATE INDEX "BillingCommunication_parentCommunicationId_idx" ON "BillingCommunication"("parentCommunicationId");

ALTER TABLE "BillingCommunication" ADD CONSTRAINT "BillingCommunication_parentCommunicationId_fkey" FOREIGN KEY ("parentCommunicationId") REFERENCES "BillingCommunication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BillingInboundUnresolvedMessage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mailboxKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "internetMessageId" TEXT,
    "senderAddress" TEXT NOT NULL,
    "toAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "reason" "BillingInboundUnresolvedReason" NOT NULL,
    "detail" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInboundUnresolvedMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingInboundUnresolvedMessage_key_key" ON "BillingInboundUnresolvedMessage"("key");

CREATE UNIQUE INDEX "BillingInboundUnresolvedMessage_provider_providerMessageId_key" ON "BillingInboundUnresolvedMessage"("provider", "providerMessageId");

CREATE INDEX "BillingInboundUnresolvedMessage_mailboxKey_createdAt_idx" ON "BillingInboundUnresolvedMessage"("mailboxKey", "createdAt");

CREATE TABLE "BillingInboundMailboxState" (
    "id" TEXT NOT NULL,
    "mailboxKey" TEXT NOT NULL,
    "uidValidity" BIGINT,
    "lastProcessedUid" BIGINT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInboundMailboxState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingInboundMailboxState_mailboxKey_key" ON "BillingInboundMailboxState"("mailboxKey");
