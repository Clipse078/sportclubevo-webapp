-- SCE-FINANCE-07D — tenant commitment approval policy (amount threshold foundation)

CREATE TABLE "FinanceCommitmentApprovalPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "thresholdAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "thresholdCurrency" TEXT NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceCommitmentApprovalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceCommitmentApprovalPolicy_tenantId_key"
  ON "FinanceCommitmentApprovalPolicy"("tenantId");

ALTER TABLE "FinanceCommitmentApprovalPolicy"
  ADD CONSTRAINT "FinanceCommitmentApprovalPolicy_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitmentApprovalPolicy"
  ADD CONSTRAINT "FinanceCommitmentApprovalPolicy_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD COLUMN "approvalPolicyEnabledSnapshot" BOOLEAN,
  ADD COLUMN "approvalThresholdMinorSnapshot" INTEGER,
  ADD COLUMN "approvalPolicyCurrencySnapshot" TEXT;
