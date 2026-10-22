-- SCE-FINANCE-01D — budget foundation (tenant-safe, non-destructive).

CREATE TYPE "FinanceBudgetVersionStatus" AS ENUM ('DRAFT', 'APPROVED');

CREATE TABLE "FinanceBudget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeYearId" TEXT NOT NULL,
    "name" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceBudget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceBudgetVersion" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "status" "FinanceBudgetVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceBudgetVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceBudgetLine" (
    "id" TEXT NOT NULL,
    "budgetVersionId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceBudgetLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceBudget_tenantId_financeYearId_key" ON "FinanceBudget"("tenantId", "financeYearId");
CREATE INDEX "FinanceBudget_tenantId_idx" ON "FinanceBudget"("tenantId");
CREATE INDEX "FinanceBudget_financeYearId_idx" ON "FinanceBudget"("financeYearId");

CREATE INDEX "FinanceBudgetVersion_budgetId_status_idx" ON "FinanceBudgetVersion"("budgetId", "status");

CREATE UNIQUE INDEX "FinanceBudgetLine_budgetVersionId_financialAccountId_key" ON "FinanceBudgetLine"("budgetVersionId", "financialAccountId");
CREATE INDEX "FinanceBudgetLine_financialAccountId_idx" ON "FinanceBudgetLine"("financialAccountId");

ALTER TABLE "FinanceBudget" ADD CONSTRAINT "FinanceBudget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceBudget" ADD CONSTRAINT "FinanceBudget_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceBudget" ADD CONSTRAINT "FinanceBudget_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceBudgetVersion" ADD CONSTRAINT "FinanceBudgetVersion_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "FinanceBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceBudgetVersion" ADD CONSTRAINT "FinanceBudgetVersion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceBudgetVersion" ADD CONSTRAINT "FinanceBudgetVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceBudgetLine" ADD CONSTRAINT "FinanceBudgetLine_budgetVersionId_fkey" FOREIGN KEY ("budgetVersionId") REFERENCES "FinanceBudgetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceBudgetLine" ADD CONSTRAINT "FinanceBudgetLine_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Organisation finance permissions (FIN-01D).
INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'finance.budget.view', 'View organisation budgets', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'finance.budget.manage', 'Manage draft budgets', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'finance.approve', 'Approve finance baselines', 'FINANCE', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" = 'super_admin'
  AND p."key" IN ('finance.budget.view', 'finance.budget.manage', 'finance.approve')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" LIKE 'club_admin__%'
  AND p."key" IN (
    'finance.budget.view',
    'finance.budget.manage',
    'finance.approve'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
