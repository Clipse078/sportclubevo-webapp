-- SCE Tenant Documentation — archive + Papierkorb (soft delete) on pages.

ALTER TABLE "TenantDocumentationPage"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "trashedAt" TIMESTAMP(3);

CREATE INDEX "TenantDocumentationPage_tenantId_archivedAt_idx" ON "TenantDocumentationPage"("tenantId", "archivedAt");
CREATE INDEX "TenantDocumentationPage_tenantId_trashedAt_idx" ON "TenantDocumentationPage"("tenantId", "trashedAt");