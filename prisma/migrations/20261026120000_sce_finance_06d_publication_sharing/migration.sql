-- FIN-06D — controlled publication version sharing (additive, tenant-safe).

CREATE TABLE "FinancePublicationShare" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "publicationVersionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "createdByUserId" TEXT,
  "lastAccessedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancePublicationShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancePublicationShare_tokenHash_key" ON "FinancePublicationShare"("tokenHash");
CREATE INDEX "FinancePublicationShare_tenantId_publicationId_idx" ON "FinancePublicationShare"("tenantId", "publicationId");
CREATE INDEX "FinancePublicationShare_tenantId_publicationVersionId_idx" ON "FinancePublicationShare"("tenantId", "publicationVersionId");
CREATE INDEX "FinancePublicationShare_tenantId_revokedAt_idx" ON "FinancePublicationShare"("tenantId", "revokedAt");
CREATE INDEX "FinancePublicationShare_tenantId_expiresAt_idx" ON "FinancePublicationShare"("tenantId", "expiresAt");

ALTER TABLE "FinancePublicationShare" ADD CONSTRAINT "FinancePublicationShare_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationShare" ADD CONSTRAINT "FinancePublicationShare_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "FinancePublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationShare" ADD CONSTRAINT "FinancePublicationShare_publicationVersionId_fkey" FOREIGN KEY ("publicationVersionId") REFERENCES "FinancePublicationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationShare" ADD CONSTRAINT "FinancePublicationShare_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationShare" ADD CONSTRAINT "FinancePublicationShare_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
