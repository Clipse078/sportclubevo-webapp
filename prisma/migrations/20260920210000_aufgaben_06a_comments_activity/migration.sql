-- AUFGABEN-06A — task-native comments and audit timeline support index

CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_tenantId_idx" ON "TaskComment"("tenantId");

CREATE INDEX "TaskComment_tenantId_taskId_createdAt_idx" ON "TaskComment"("tenantId", "taskId", "createdAt");

CREATE INDEX "AuditLog_tenantId_moduleKey_entityType_entityId_createdAt_idx" ON "AuditLog"("tenantId", "moduleKey", "entityType", "entityId", "createdAt");

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
