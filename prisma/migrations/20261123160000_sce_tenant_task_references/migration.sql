-- SCE tenant-wide public references (FCA-123). One sequence per tenant across record kinds.

CREATE TYPE "SceTenantPublicRecordKind" AS ENUM ('TASK', 'STRATEGY', 'TARGET', 'MELDUNG');

ALTER TABLE "Tenant" ADD COLUMN "publicReferenceShortCode" TEXT;

CREATE TABLE "SceTenantPublicNumberSequence" (
    "tenantId" TEXT NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "SceTenantPublicNumberSequence_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "SceTenantPublicNumberSequence" ADD CONSTRAINT "SceTenantPublicNumberSequence_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SceTenantPublicNumberLedger" (
    "tenantId" TEXT NOT NULL,
    "tenantPublicNumber" BIGINT NOT NULL,
    "recordKind" "SceTenantPublicRecordKind" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SceTenantPublicNumberLedger_pkey" PRIMARY KEY ("tenantId", "tenantPublicNumber")
);

ALTER TABLE "SceTenantPublicNumberLedger" ADD CONSTRAINT "SceTenantPublicNumberLedger_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SceTenantPublicNumberLedger_tenantId_recordKind_entityId_idx"
    ON "SceTenantPublicNumberLedger"("tenantId", "recordKind", "entityId");

ALTER TABLE "Task" ADD COLUMN "tenantPublicNumber" BIGINT;

CREATE UNIQUE INDEX "Tenant_publicReferenceShortCode_upper_key"
    ON "Tenant" (UPPER("publicReferenceShortCode"))
    WHERE "publicReferenceShortCode" IS NOT NULL;

CREATE UNIQUE INDEX "Task_tenantId_tenantPublicNumber_key" ON "Task"("tenantId", "tenantPublicNumber");