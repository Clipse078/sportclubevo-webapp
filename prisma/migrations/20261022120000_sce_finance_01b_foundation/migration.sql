-- SCE-FINANCE-01B — organisation finance foundation (tenant-safe, non-destructive).

ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'FINANCE';

CREATE TYPE "FinanceSetupStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'CONFIGURED');
CREATE TYPE "FinanceYearStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "FinanceStructureLifecycle" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "CanonicalAccountSemantic" AS ENUM ('INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY', 'TRANSFER', 'OTHER');
CREATE TYPE "FinancialAccountNodeKind" AS ENUM ('GROUP', 'POSTING');
CREATE TYPE "FinanceCapabilityKey" AS ENUM (
  'OVERVIEW',
  'MANAGEMENT_INCOME_STATEMENT',
  'BUDGETING',
  'ACTUALS',
  'FORECASTING',
  'COST_CENTERS',
  'PROJECTS',
  'FUNDS',
  'RECEIVABLES',
  'PAYABLES',
  'COMMITMENTS',
  'APPROVALS',
  'PERSONNEL_FINANCE',
  'EVENT_FINANCE',
  'GRANTS',
  'LIQUIDITY',
  'ACCOUNTING_INTEGRATION',
  'UNIT_ECONOMICS',
  'REPORTING'
);

CREATE TABLE "FinanceConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "setupStatus" "FinanceSetupStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "baseCurrency" TEXT,
    "currentFinanceYearId" TEXT,
    "configuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceYear" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FinanceYearStatus" NOT NULL DEFAULT 'DRAFT',
    "seasonId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceTenantCapability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "capability" "FinanceCapabilityKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTenantCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCostCenter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lifecycle" "FinanceStructureLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCostCenter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "nodeKind" "FinancialAccountNodeKind" NOT NULL DEFAULT 'GROUP',
    "canonicalSemantic" "CanonicalAccountSemantic" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lifecycle" "FinanceStructureLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialReportingGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lifecycle" "FinanceStructureLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReportingGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceConfiguration_tenantId_key" ON "FinanceConfiguration"("tenantId");
CREATE INDEX "FinanceConfiguration_tenantId_setupStatus_idx" ON "FinanceConfiguration"("tenantId", "setupStatus");

CREATE INDEX "FinanceYear_tenantId_status_idx" ON "FinanceYear"("tenantId", "status");
CREATE INDEX "FinanceYear_tenantId_startDate_endDate_idx" ON "FinanceYear"("tenantId", "startDate", "endDate");
CREATE INDEX "FinanceYear_seasonId_idx" ON "FinanceYear"("seasonId");

CREATE UNIQUE INDEX "FinanceTenantCapability_tenantId_capability_key" ON "FinanceTenantCapability"("tenantId", "capability");
CREATE INDEX "FinanceTenantCapability_tenantId_enabled_idx" ON "FinanceTenantCapability"("tenantId", "enabled");

CREATE INDEX "FinanceCostCenter_tenantId_lifecycle_idx" ON "FinanceCostCenter"("tenantId", "lifecycle");
CREATE INDEX "FinanceCostCenter_tenantId_parentId_idx" ON "FinanceCostCenter"("tenantId", "parentId");
CREATE INDEX "FinanceCostCenter_parentId_idx" ON "FinanceCostCenter"("parentId");

CREATE INDEX "FinancialAccount_tenantId_lifecycle_idx" ON "FinancialAccount"("tenantId", "lifecycle");
CREATE INDEX "FinancialAccount_tenantId_parentId_idx" ON "FinancialAccount"("tenantId", "parentId");
CREATE INDEX "FinancialAccount_tenantId_canonicalSemantic_idx" ON "FinancialAccount"("tenantId", "canonicalSemantic");

CREATE INDEX "FinancialReportingGroup_tenantId_lifecycle_idx" ON "FinancialReportingGroup"("tenantId", "lifecycle");
CREATE INDEX "FinancialReportingGroup_tenantId_parentId_idx" ON "FinancialReportingGroup"("tenantId", "parentId");

ALTER TABLE "FinanceConfiguration" ADD CONSTRAINT "FinanceConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceConfiguration" ADD CONSTRAINT "FinanceConfiguration_currentFinanceYearId_fkey" FOREIGN KEY ("currentFinanceYearId") REFERENCES "FinanceYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceYear" ADD CONSTRAINT "FinanceYear_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceYear" ADD CONSTRAINT "FinanceYear_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceTenantCapability" ADD CONSTRAINT "FinanceTenantCapability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCostCenter" ADD CONSTRAINT "FinanceCostCenter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceCostCenter" ADD CONSTRAINT "FinanceCostCenter_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinanceCostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialReportingGroup" ADD CONSTRAINT "FinancialReportingGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialReportingGroup" ADD CONSTRAINT "FinancialReportingGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialReportingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'finance.view', 'View organisation finance', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'finance.structure.manage', 'Manage finance structure', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'finance.admin', 'Administer finance configuration', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
