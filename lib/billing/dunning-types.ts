import type { BillingDunningStatus } from "@prisma/client";

export type TenantDunningSnapshot = {
  tenantId: string;
  dunningStatus: BillingDunningStatus;
  firstPaymentFailureAt: string | null;
  latestPaymentFailureAt: string | null;
  gracePeriodEndsAt: string | null;
  automaticallySuspendedAt: string | null;
  resolvedAt: string | null;
  lastDunningEventAt: string | null;
  dunningExemptUntil: string | null;
  dunningExemptNote: string | null;
  automaticDunningEnabled: boolean;
  reconciliationRequired: boolean;
};

export type TenantDunningPolicy = {
  enabled: boolean;
  graceDays: number;
  exemptUntil: string | null;
  exemptActive: boolean;
};

export type DunningBatchSummary = {
  evaluated: number;
  suspended: number;
  reactivated: number;
  resolved: number;
  exempt: number;
  skipped: number;
  failed: number;
  reconciliationRequired: number;
  remainingGraceCandidates: number;
};
