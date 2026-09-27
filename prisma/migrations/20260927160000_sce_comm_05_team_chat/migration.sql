-- SCE-COMM-05 — Team chat (additive on COMM-04)

ALTER TABLE "PlatformCommunication"
  ADD COLUMN "replyToCommunicationId" TEXT;

CREATE INDEX "PlatformCommunication_tenantId_replyToCommunicationId_idx"
  ON "PlatformCommunication"("tenantId", "replyToCommunicationId");

CREATE INDEX "PlatformCommunication_tenantId_conversationId_publishedAt_idx"
  ON "PlatformCommunication"("tenantId", "conversationId", "publishedAt");

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_replyToCommunicationId_fkey"
  FOREIGN KEY ("replyToCommunicationId") REFERENCES "PlatformCommunication"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlatformCommunicationReaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "reactionKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformCommunicationReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationMention" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "mentionedPersonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformCommunicationMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformCommunicationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationReaction_communicationId_personId_reactionKey_key"
  ON "PlatformCommunicationReaction"("communicationId", "personId", "reactionKey");

CREATE INDEX "PlatformCommunicationReaction_tenantId_communicationId_idx"
  ON "PlatformCommunicationReaction"("tenantId", "communicationId");

CREATE INDEX "PlatformCommunicationReaction_tenantId_personId_idx"
  ON "PlatformCommunicationReaction"("tenantId", "personId");

CREATE UNIQUE INDEX "PlatformCommunicationMention_communicationId_mentionedPersonId_key"
  ON "PlatformCommunicationMention"("communicationId", "mentionedPersonId");

CREATE INDEX "PlatformCommunicationMention_tenantId_communicationId_idx"
  ON "PlatformCommunicationMention"("tenantId", "communicationId");

CREATE INDEX "PlatformCommunicationMention_tenantId_mentionedPersonId_idx"
  ON "PlatformCommunicationMention"("tenantId", "mentionedPersonId");

CREATE UNIQUE INDEX "PlatformCommunicationAttachment_communicationId_attachmentId_key"
  ON "PlatformCommunicationAttachment"("communicationId", "attachmentId");

CREATE UNIQUE INDEX "PlatformCommunicationAttachment_communicationId_sortOrder_key"
  ON "PlatformCommunicationAttachment"("communicationId", "sortOrder");

CREATE INDEX "PlatformCommunicationAttachment_tenantId_communicationId_sortOrder_idx"
  ON "PlatformCommunicationAttachment"("tenantId", "communicationId", "sortOrder");

CREATE INDEX "PlatformCommunicationAttachment_tenantId_attachmentId_idx"
  ON "PlatformCommunicationAttachment"("tenantId", "attachmentId");

ALTER TABLE "PlatformCommunicationReaction"
  ADD CONSTRAINT "PlatformCommunicationReaction_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationReaction"
  ADD CONSTRAINT "PlatformCommunicationReaction_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationReaction"
  ADD CONSTRAINT "PlatformCommunicationReaction_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationMention"
  ADD CONSTRAINT "PlatformCommunicationMention_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationMention"
  ADD CONSTRAINT "PlatformCommunicationMention_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationMention"
  ADD CONSTRAINT "PlatformCommunicationMention_mentionedPersonId_fkey"
  FOREIGN KEY ("mentionedPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationAttachment"
  ADD CONSTRAINT "PlatformCommunicationAttachment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationAttachment"
  ADD CONSTRAINT "PlatformCommunicationAttachment_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationAttachment"
  ADD CONSTRAINT "PlatformCommunicationAttachment_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "CommunicationAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
