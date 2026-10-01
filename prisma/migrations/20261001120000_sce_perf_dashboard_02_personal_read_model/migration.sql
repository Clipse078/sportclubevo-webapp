-- SCE-PERF-DASHBOARD-02 — personal dashboard read model (additive)

ALTER TYPE "WorkspaceBackgroundJobType" ADD VALUE 'PERSONAL_DASHBOARD_REBUILD';

CREATE TABLE "PersonalDashboardReadModel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "projectionVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" JSONB NOT NULL,
    "horizonStart" TIMESTAMP(3) NOT NULL,
    "horizonEnd" TIMESTAMP(3) NOT NULL,
    "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDashboardReadModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalDashboardReadModel_tenantId_userId_key" ON "PersonalDashboardReadModel"("tenantId", "userId");
CREATE INDEX "PersonalDashboardReadModel_tenantId_userId_idx" ON "PersonalDashboardReadModel"("tenantId", "userId");
CREATE INDEX "PersonalDashboardReadModel_tenantId_personId_idx" ON "PersonalDashboardReadModel"("tenantId", "personId");

ALTER TABLE "PersonalDashboardReadModel" ADD CONSTRAINT "PersonalDashboardReadModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalDashboardReadModel" ADD CONSTRAINT "PersonalDashboardReadModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
