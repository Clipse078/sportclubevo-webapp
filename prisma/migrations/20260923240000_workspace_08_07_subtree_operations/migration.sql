-- WORKSPACE-08-07 — durable large subtree destructive operations

CREATE TYPE "WorkspaceSubtreeOperationType" AS ENUM (
  'FOLDER_PERMANENT_DELETE',
  'FOLDER_TRASH'
);

CREATE TYPE "WorkspaceSubtreeOperationStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'PARTIALLY_BLOCKED',
  'FAILED'
);

ALTER TYPE "WorkspaceBackgroundJobType" ADD VALUE 'SUBTREE_OPERATION_BATCH';

CREATE TABLE "WorkspaceSubtreeOperation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rootFolderId" TEXT NOT NULL,
    "type" "WorkspaceSubtreeOperationType" NOT NULL,
    "status" "WorkspaceSubtreeOperationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT NOT NULL,
    "totalEstimated" INTEGER,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSubtreeOperation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceSubtreeOperation_tenantId_status_idx"
  ON "WorkspaceSubtreeOperation"("tenantId", "status");

CREATE INDEX "WorkspaceSubtreeOperation_tenantId_rootFolderId_type_idx"
  ON "WorkspaceSubtreeOperation"("tenantId", "rootFolderId", "type");

CREATE INDEX "WorkspaceSubtreeOperation_createdAt_status_idx"
  ON "WorkspaceSubtreeOperation"("createdAt", "status");

CREATE UNIQUE INDEX "WorkspaceSubtreeOperation_tenant_root_type_active_key"
  ON "WorkspaceSubtreeOperation"("tenantId", "rootFolderId", "type")
  WHERE "status" IN ('PENDING', 'RUNNING');

ALTER TABLE "WorkspaceSubtreeOperation"
  ADD CONSTRAINT "WorkspaceSubtreeOperation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
