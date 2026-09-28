-- SCE-COMM-UX-04A: direct message reply lock + SCE inbox participant visibility
ALTER TYPE "PlatformCommunicationContextKind" ADD VALUE IF NOT EXISTS 'DIRECT';
ALTER TYPE "PlatformCommunicationConversationKind" ADD VALUE IF NOT EXISTS 'DIRECT_THREAD';

ALTER TABLE "PlatformCommunication" ADD COLUMN IF NOT EXISTS "repliesAllowed" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CommunicationCenterConversation" ADD COLUMN IF NOT EXISTS "repliesAllowed" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CommunicationCenterConversationParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationCenterConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationCenterConversationParticipant_conversationId_userId_key" ON "CommunicationCenterConversationParticipant"("conversationId", "userId");

CREATE INDEX "cc_conv_part_tenant_user_idx" ON "CommunicationCenterConversationParticipant"("tenantId", "userId", "conversationId");

ALTER TABLE "CommunicationCenterConversationParticipant" ADD CONSTRAINT "CommunicationCenterConversationParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversationParticipant" ADD CONSTRAINT "CommunicationCenterConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationCenterConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationCenterConversationParticipant" ADD CONSTRAINT "CommunicationCenterConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
