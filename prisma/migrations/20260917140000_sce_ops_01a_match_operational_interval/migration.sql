-- SCE-OPS-01A — operational Match end override + tenant default duration policy

ALTER TABLE "Event" ADD COLUMN "operationalEndAtOverride" TIMESTAMP(3);

CREATE TABLE "TenantMatchOperationalPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultMatchDurationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMatchOperationalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantMatchOperationalPolicy_tenantId_key" ON "TenantMatchOperationalPolicy"("tenantId");

ALTER TABLE "TenantMatchOperationalPolicy" ADD CONSTRAINT "TenantMatchOperationalPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
