-- FIN-07A — commitment domain foundation (additive)

CREATE TYPE "FinanceCommitmentLifecycleStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'ACTIVE',
  'FULFILLED',
  'CANCELLED'
);

CREATE TYPE "FinanceCommitmentApprovalStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "FinanceCommitmentApprovalDecisionKind" AS ENUM (
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "FinanceEconomicEvidenceKind" AS ENUM (
  'COMMITMENT',
  'EXPECTED_FINANCIAL_EVENT',
  'SUPPLIER_BILL',
  'ACTUAL',
  'PAYMENT',
  'BANK_TRANSACTION',
  'ACCOUNTING_ENTRY'
);

ALTER TYPE "FinanceExpectedFinancialEventSourceKind" ADD VALUE 'COMMITMENT';

CREATE TABLE "FinanceCommitment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "economicObligationKey" TEXT NOT NULL,
  "lifecycleStatus" "FinanceCommitmentLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalStatus" "FinanceCommitmentApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "externalReference" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "financialAccountId" TEXT,
  "costCenterId" TEXT,
  "partyName" TEXT,
  "partyReference" TEXT,
  "commitmentDate" DATE NOT NULL,
  "expectedEvidenceDate" DATE,
  "expectedPaymentDate" DATE,
  "responsibleUserId" TEXT,
  "requestedByUserId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvalDecidedAt" TIMESTAMP(3),
  "approvalDecidedByUserId" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceCommitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCommitmentApprovalDecision" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "commitmentId" TEXT NOT NULL,
  "decision" "FinanceCommitmentApprovalDecisionKind" NOT NULL,
  "comment" TEXT,
  "decidedByUserId" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinanceCommitmentApprovalDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceEconomicEvidenceLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "economicObligationKey" TEXT NOT NULL,
  "evidenceKind" "FinanceEconomicEvidenceKind" NOT NULL,
  "evidenceRefType" TEXT NOT NULL,
  "evidenceRefId" TEXT NOT NULL,
  "amountMinorSnapshot" INTEGER,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "linkedByUserId" TEXT,

  CONSTRAINT "FinanceEconomicEvidenceLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceCommitment_tenantId_lifecycleStatus_idx"
  ON "FinanceCommitment"("tenantId", "lifecycleStatus");

CREATE INDEX "FinanceCommitment_tenantId_approvalStatus_idx"
  ON "FinanceCommitment"("tenantId", "approvalStatus");

CREATE INDEX "FinanceCommitment_tenantId_financeYearId_idx"
  ON "FinanceCommitment"("tenantId", "financeYearId");

CREATE INDEX "FinanceCommitment_tenantId_responsibleUserId_idx"
  ON "FinanceCommitment"("tenantId", "responsibleUserId");

CREATE INDEX "FinanceCommitment_tenantId_expectedPaymentDate_idx"
  ON "FinanceCommitment"("tenantId", "expectedPaymentDate");

CREATE INDEX "FinanceCommitment_tenantId_economicObligationKey_idx"
  ON "FinanceCommitment"("tenantId", "economicObligationKey");

CREATE INDEX "FinanceCommitment_financialAccountId_idx"
  ON "FinanceCommitment"("financialAccountId");

CREATE INDEX "FinanceCommitment_costCenterId_idx"
  ON "FinanceCommitment"("costCenterId");

CREATE INDEX "FinanceCommitmentApprovalDecision_tenantId_commitmentId_idx"
  ON "FinanceCommitmentApprovalDecision"("tenantId", "commitmentId");

CREATE INDEX "FinanceCommitmentApprovalDecision_commitmentId_idx"
  ON "FinanceCommitmentApprovalDecision"("commitmentId");

CREATE UNIQUE INDEX "FinanceEconomicEvidenceLink_tenant_evidence_unique_idx"
  ON "FinanceEconomicEvidenceLink"("tenantId", "evidenceKind", "evidenceRefType", "evidenceRefId");

CREATE INDEX "FinanceEconomicEvidenceLink_tenantId_economicObligationKey_idx"
  ON "FinanceEconomicEvidenceLink"("tenantId", "economicObligationKey");

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_financeYearId_fkey"
  FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_financialAccountId_fkey"
  FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "FinanceCostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_approvalDecidedByUserId_fkey"
  FOREIGN KEY ("approvalDecidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitment"
  ADD CONSTRAINT "FinanceCommitment_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitmentApprovalDecision"
  ADD CONSTRAINT "FinanceCommitmentApprovalDecision_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitmentApprovalDecision"
  ADD CONSTRAINT "FinanceCommitmentApprovalDecision_commitmentId_fkey"
  FOREIGN KEY ("commitmentId") REFERENCES "FinanceCommitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCommitmentApprovalDecision"
  ADD CONSTRAINT "FinanceCommitmentApprovalDecision_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceEconomicEvidenceLink"
  ADD CONSTRAINT "FinanceEconomicEvidenceLink_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceEconomicEvidenceLink"
  ADD CONSTRAINT "FinanceEconomicEvidenceLink_linkedByUserId_fkey"
  FOREIGN KEY ("linkedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
