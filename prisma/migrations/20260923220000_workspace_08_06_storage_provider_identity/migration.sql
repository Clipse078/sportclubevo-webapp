-- WORKSPACE-08-06 — durable storage provider identity per immutable version row.

ALTER TABLE "WorkspaceDocumentVersion"
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'vercel-blob';

CREATE INDEX "WorkspaceDocumentVersion_tenantId_storageProvider_storageKey_idx"
ON "WorkspaceDocumentVersion"("tenantId", "storageProvider", "storageKey");
