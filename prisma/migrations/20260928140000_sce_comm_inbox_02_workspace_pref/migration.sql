-- SCE-COMM-INBOX-02: per-user communication center workspace preferences
CREATE TABLE "UserCommunicationInboxWorkspacePref" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'STANDARD',
    "density" TEXT NOT NULL DEFAULT 'STANDARD',
    "listSplitPercent" INTEGER NOT NULL DEFAULT 38,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCommunicationInboxWorkspacePref_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCommInboxWsPref_tenant_user_key" ON "UserCommunicationInboxWorkspacePref"("tenantId", "userId");

CREATE INDEX "UserCommInboxWsPref_tenant_user_idx" ON "UserCommunicationInboxWorkspacePref"("tenantId", "userId");

ALTER TABLE "UserCommunicationInboxWorkspacePref" ADD CONSTRAINT "UserCommInboxWsPref_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCommunicationInboxWorkspacePref" ADD CONSTRAINT "UserCommInboxWsPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
