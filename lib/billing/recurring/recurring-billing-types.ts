export const RECURRING_BILLING_CONTRACT_OUTCOMES = [
  "CREATED_AND_SENT",
  "CREATED_NOT_SENT",
  "SKIPPED_ALREADY_INVOICED",
  "SKIPPED_NOT_DUE",
  "SKIPPED_INACTIVE",
  "SKIPPED_BEFORE_START",
  "SKIPPED_ENDED",
  "SKIPPED_ALL_INVOICED",
  "BLOCKED_NO_RECIPIENT",
  "BLOCKED_NO_BANK_ACCOUNT",
  "BLOCKED_INVALID_CONFIGURATION",
  "PREVIEW_WOULD_CREATE",
  "FAILED",
] as const;

export type RecurringBillingContractOutcome =
  (typeof RECURRING_BILLING_CONTRACT_OUTCOMES)[number];

export type RecurringBillingContractResult = {
  contractKey: string;
  contractNumber: string;
  customerKey: string | null;
  customerName: string | null;
  outcome: RecurringBillingContractOutcome;
  reason: string;
  periodStart: string | null;
  periodEnd: string | null;
  netTotalMinor: number | null;
  vatTotalMinor: number | null;
  grossTotalMinor: number | null;
  recipientEmail: string | null;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  errorMessage: string | null;
};

export type RecurringBillingRunSummary = {
  mode: "DRY_RUN" | "EXECUTE";
  trigger: "CRON" | "MANUAL";
  asOfDate: string;
  deliverAutomatically: boolean;
  contractsEvaluated: number;
  invoicesCreated: number;
  invoicesSent: number;
  skipped: number;
  blocked: number;
  failed: number;
  results: RecurringBillingContractResult[];
};

export type RunRecurringBillingInput = {
  mode: "DRY_RUN" | "EXECUTE";
  trigger: "CRON" | "MANUAL";
  asOfDate?: string;
  deliverAutomatically?: boolean;
  actorUserId: string | null;
  contractKeys?: string[];
  persistRun?: boolean;
};

export type RunRecurringBillingResult = {
  runKey: string | null;
  summary: RecurringBillingRunSummary;
};

export type RecurringBillingAutomationStatus = {
  scheduler: {
    enabled: boolean;
    cronPath: string;
    scheduleUtc: string;
    nextEvaluationHint: string;
  };
  lastRun: {
    key: string;
    mode: string;
    trigger: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    asOfDate: string;
    summary: RecurringBillingRunSummary;
  } | null;
};
