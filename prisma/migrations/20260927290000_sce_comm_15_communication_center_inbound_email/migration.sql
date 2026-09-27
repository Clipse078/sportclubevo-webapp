-- SCE-COMM-15: Communication Center + inbound Email/IMAP foundation.

CREATE TYPE "CommunicationCenterConnectorType" AS ENUM ('IMAP');

CREATE TYPE "CommunicationCenterMailboxStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DISCONNECTED');

CREATE TYPE "CommunicationCenterImapSecurity" AS ENUM ('TLS', 'STARTTLS', 'NONE');

CREATE TYPE "CommunicationCenterConversationStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TYPE "CommunicationCenterChannel" AS ENUM ('EMAIL', 'SCE');

CREATE TYPE "CommunicationCenterMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE "CommunicationCenterMessageStatus" AS ENUM ('RECEIVED', 'DRAFT', 'SENDING', 'SENT', 'FAILED');

CREATE TYPE "CommunicationCenterContactMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'AMBIGUOUS');

CREATE TYPE "CommunicationCenterContextKind" AS ENUM (
  'PERSON',
  'TEAM',
  'ORG_UNIT',
  'SPONSOR_CONTACT',
  'SPONSOR_ORGANISATION',
  'EVENT',
  'PLATFORM_COMMUNICATION'
);

CREATE TABLE "CommunicationCenterMailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "connectorType" "CommunicationCenterConnectorType" NOT NULL DEFAULT 'IMAP',
    "status" "CommunicationCenterMailboxStatus" NOT NULL DEFAULT 'ACTIVE',
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "imapSecurity" "CommunicationCenterImapSecurity",
    "imapUsername" TEXT,
    "credentialEncrypted" TEXT,
    "credentialKeyVersion" INTEGER,
    "lastSyncAttemptAt" TIMESTAMP(3),
    "lastSyncSuccessAt" TIMESTAMP(3),
    "lastSyncErrorCode" TEXT,
    "lastSyncErrorMessage" TEXT,
    "syncLeaseToken" TEXT,
    "syncLeaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCenterMailbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterMailboxFolder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "providerPath" TEXT NOT NULL,
    "uidValidity" BIGINT,
    "lastProcessedUid" BIGINT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCenterMailboxFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mailboxId" TEXT,
    "channel" "CommunicationCenterChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "CommunicationCenterConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "threadRootMessageId" TEXT,
    "previewText" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToUserId" TEXT,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "contactMatchStatus" "CommunicationCenterContactMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedPersonId" TEXT,
    "matchedSponsorContactId" TEXT,
    "platformCommunicationId" TEXT,
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCenterConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "mailboxId" TEXT,
    "folderId" TEXT,
    "direction" "CommunicationCenterMessageDirection" NOT NULL,
    "status" "CommunicationCenterMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "imapUid" BIGINT,
    "uidValidity" BIGINT,
    "providerMessageKey" TEXT,
    "messageIdHeader" TEXT,
    "inReplyTo" TEXT,
    "references" JSONB,
    "fromAddress" TEXT,
    "fromDisplayName" TEXT,
    "toAddresses" JSONB,
    "ccAddresses" JSONB,
    "subject" TEXT,
    "bodyText" TEXT,
    "bodyHtmlSanitized" TEXT,
    "remoteImagesBlocked" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "outboundIdempotencyKey" TEXT,
    "providerMessageId" TEXT,
    "deliveryError" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCenterMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterMessageAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationCenterMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterConversationReadState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCenterConversationReadState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationCenterContextLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "contextKind" "CommunicationCenterContextKind" NOT NULL,
    "contextId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationCenterContextLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationCenterMailbox_tenantId_emailAddress_key" ON "CommunicationCenterMailbox"("tenantId", "emailAddress");

CREATE INDEX "CommunicationCenterMailbox_tenantId_status_idx" ON "CommunicationCenterMailbox"("tenantId", "status");

CREATE UNIQUE INDEX "CommunicationCenterMailboxFolder_mailboxId_providerPath_key" ON "CommunicationCenterMailboxFolder"("mailboxId", "providerPath");

CREATE INDEX "CommunicationCenterMailboxFolder_tenantId_mailboxId_idx" ON "CommunicationCenterMailboxFolder"("tenantId", "mailboxId");

CREATE INDEX "CommunicationCenterConversation_tenantId_lastMessageAt_idx" ON "CommunicationCenterConversation"("tenantId", "lastMessageAt");

CREATE INDEX "CommunicationCenterConversation_tenantId_status_lastMessageAt_idx" ON "CommunicationCenterConversation"("tenantId", "status", "lastMessageAt");

CREATE INDEX "CommunicationCenterConversation_tenantId_assignedToUserId_idx" ON "CommunicationCenterConversation"("tenantId", "assignedToUserId");

CREATE INDEX "CommunicationCenterConversation_tenantId_mailboxId_idx" ON "CommunicationCenterConversation"("tenantId", "mailboxId");

CREATE UNIQUE INDEX "CommunicationCenterConversation_tenantId_threadRootMessageId_key" ON "CommunicationCenterConversation"("tenantId", "threadRootMessageId");

CREATE INDEX "CommunicationCenterMessage_tenantId_conversationId_createdAt_idx" ON "CommunicationCenterMessage"("tenantId", "conversationId", "createdAt");

CREATE UNIQUE INDEX "CommunicationCenterMessage_folderId_uidValidity_imapUid_key" ON "CommunicationCenterMessage"("folderId", "uidValidity", "imapUid");

CREATE UNIQUE INDEX "CommunicationCenterMessage_tenantId_messageIdHeader_key" ON "CommunicationCenterMessage"("tenantId", "messageIdHeader");

CREATE UNIQUE INDEX "CommunicationCenterMessage_tenantId_outboundIdempotencyKey_key" ON "CommunicationCenterMessage"("tenantId", "outboundIdempotencyKey");

CREATE INDEX "CommunicationCenterMessage_tenantId_providerMessageKey_idx" ON "CommunicationCenterMessage"("tenantId", "providerMessageKey");

CREATE UNIQUE INDEX "CommunicationCenterMessageAttachment_messageId_attachmentId_key" ON "CommunicationCenterMessageAttachment"("messageId", "attachmentId");

CREATE UNIQUE INDEX "CommunicationCenterMessageAttachment_messageId_sortOrder_key" ON "CommunicationCenterMessageAttachment"("messageId", "sortOrder");

CREATE INDEX "CommunicationCenterMessageAttachment_tenantId_messageId_idx" ON "CommunicationCenterMessageAttachment"("tenantId", "messageId");

CREATE UNIQUE INDEX "CommunicationCenterConversationReadState_conversationId_userId_key" ON "CommunicationCenterConversationReadState"("conversationId", "userId");

CREATE INDEX "CommunicationCenterConversationReadState_tenantId_userId_idx" ON "CommunicationCenterConversationReadState"("tenantId", "userId");

CREATE UNIQUE INDEX "CommunicationCenterContextLink_conversationId_contextKind_contextId_key" ON "CommunicationCenterContextLink"("conversationId", "contextKind", "contextId");

CREATE INDEX "CommunicationCenterContextLink_tenantId_conversationId_idx" ON "CommunicationCenterContextLink"("tenantId", "conversationId");

ALTER TABLE "CommunicationCenterMailbox" ADD CONSTRAINT "CommunicationCenterMailbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMailboxFolder" ADD CONSTRAINT "CommunicationCenterMailboxFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMailboxFolder" ADD CONSTRAINT "CommunicationCenterMailboxFolder_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "CommunicationCenterMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "CommunicationCenterMailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_matchedPersonId_fkey" FOREIGN KEY ("matchedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_matchedSponsorContactId_fkey" FOREIGN KEY ("matchedSponsorContactId") REFERENCES "SponsorContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversation" ADD CONSTRAINT "CommunicationCenterConversation_platformCommunicationId_fkey" FOREIGN KEY ("platformCommunicationId") REFERENCES "PlatformCommunication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessage" ADD CONSTRAINT "CommunicationCenterMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessage" ADD CONSTRAINT "CommunicationCenterMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationCenterConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessage" ADD CONSTRAINT "CommunicationCenterMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "CommunicationCenterMailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessage" ADD CONSTRAINT "CommunicationCenterMessage_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CommunicationCenterMailboxFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessage" ADD CONSTRAINT "CommunicationCenterMessage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessageAttachment" ADD CONSTRAINT "CommunicationCenterMessageAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessageAttachment" ADD CONSTRAINT "CommunicationCenterMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CommunicationCenterMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterMessageAttachment" ADD CONSTRAINT "CommunicationCenterMessageAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "CommunicationAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversationReadState" ADD CONSTRAINT "CommunicationCenterConversationReadState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversationReadState" ADD CONSTRAINT "CommunicationCenterConversationReadState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationCenterConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversationReadState" ADD CONSTRAINT "CommunicationCenterConversationReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterContextLink" ADD CONSTRAINT "CommunicationCenterContextLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterContextLink" ADD CONSTRAINT "CommunicationCenterContextLink_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationCenterConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterContextLink" ADD CONSTRAINT "CommunicationCenterContextLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
