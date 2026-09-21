-- AUFGABEN-06D — Task ↔ WorkspaceDocument supporting references (additive).

CREATE TABLE "TaskDocumentReference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDocumentReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskDocumentReference_tenantId_idx" ON "TaskDocumentReference"("tenantId");

CREATE INDEX "TaskDocumentReference_tenantId_taskId_idx" ON "TaskDocumentReference"("tenantId", "taskId");

CREATE INDEX "TaskDocumentReference_tenantId_documentId_idx" ON "TaskDocumentReference"("tenantId", "documentId");

CREATE UNIQUE INDEX "TaskDocumentReference_taskId_documentId_key" ON "TaskDocumentReference"("taskId", "documentId");

ALTER TABLE "TaskDocumentReference" ADD CONSTRAINT "TaskDocumentReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskDocumentReference" ADD CONSTRAINT "TaskDocumentReference_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskDocumentReference" ADD CONSTRAINT "TaskDocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskDocumentReference" ADD CONSTRAINT "TaskDocumentReference_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
