-- SCE-ANLIEGEN-02 — internal Meldung @mentions + MELDUNG_MENTION notifications (additive).

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MELDUNG_MENTION';

CREATE TABLE "ClubMeldungMessageMention" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMeldungMessageMention_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubMeldungMessageMention_tenantId_messageId_idx" ON "ClubMeldungMessageMention"("tenantId", "messageId");

CREATE INDEX "ClubMeldungMessageMention_tenantId_userId_idx" ON "ClubMeldungMessageMention"("tenantId", "userId");

CREATE UNIQUE INDEX "ClubMeldungMessageMention_messageId_userId_key" ON "ClubMeldungMessageMention"("messageId", "userId");

ALTER TABLE "ClubMeldungMessageMention" ADD CONSTRAINT "ClubMeldungMessageMention_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungMessageMention" ADD CONSTRAINT "ClubMeldungMessageMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ClubMeldungMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungMessageMention" ADD CONSTRAINT "ClubMeldungMessageMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;