-- WORKSPACE-08-05 — durable workspace background jobs (scan execution, purge recovery, future ops)

CREATE TYPE "WorkspaceBackgroundJobStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'RETRY',
  'SUCCEEDED',
  'DEAD'
);

CREATE TYPE "WorkspaceBackgroundJobType" AS ENUM (
  'MALWARE_SCAN_VERSION',
  'DOCUMENT_PURGE_FINALIZE'
);

CREATE TABLE "WorkspaceBackgroundJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "WorkspaceBackgroundJobType" NOT NULL,
    "status" "WorkspaceBackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "payloadJson" JSONB NOT NULL,
    "deduplicationKey" TEXT,
    "correlationId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceBackgroundJob_status_availableAt_idx"
  ON "WorkspaceBackgroundJob"("status", "availableAt");

CREATE INDEX "WorkspaceBackgroundJob_tenantId_status_availableAt_idx"
  ON "WorkspaceBackgroundJob"("tenantId", "status", "availableAt");

CREATE INDEX "WorkspaceBackgroundJob_tenantId_type_status_idx"
  ON "WorkspaceBackgroundJob"("tenantId", "type", "status");

CREATE INDEX "WorkspaceBackgroundJob_leaseExpiresAt_idx"
  ON "WorkspaceBackgroundJob"("leaseExpiresAt");

CREATE INDEX "WorkspaceBackgroundJob_tenantId_deduplicationKey_idx"
  ON "WorkspaceBackgroundJob"("tenantId", "deduplicationKey");

-- At most one active (non-terminal) job per tenant + deduplication key.
CREATE UNIQUE INDEX "WorkspaceBackgroundJob_tenantId_deduplicationKey_active_key"
  ON "WorkspaceBackgroundJob"("tenantId", "deduplicationKey")
  WHERE "status" IN ('PENDING', 'RUNNING', 'RETRY') AND "deduplicationKey" IS NOT NULL;

ALTER TABLE "WorkspaceBackgroundJob"
  ADD CONSTRAINT "WorkspaceBackgroundJob_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
