import {
  describeRecurringBillingScheduleHint,
  RECURRING_BILLING_CRON_PATH,
  RECURRING_BILLING_CRON_SCHEDULE_UTC,
} from "./recurring-billing-config";
import { formatBillingDateOnly } from "./billing-period";
import { findLatestBillingRecurringRun } from "./recurring-billing-repository";
import type {
  RecurringBillingAutomationStatus,
  RecurringBillingRunSummary,
} from "./recurring-billing-types";

function parseStoredSummary(value: unknown): RecurringBillingRunSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as RecurringBillingRunSummary;
}

export async function getRecurringBillingAutomationStatus(): Promise<RecurringBillingAutomationStatus> {
  const latest = await findLatestBillingRecurringRun();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  return {
    scheduler: {
      enabled: cronSecretConfigured,
      cronPath: RECURRING_BILLING_CRON_PATH,
      scheduleUtc: RECURRING_BILLING_CRON_SCHEDULE_UTC,
      nextEvaluationHint: describeRecurringBillingScheduleHint(),
    },
    lastRun: latest
      ? {
          key: latest.key,
          mode: latest.mode,
          trigger: latest.trigger,
          status: latest.status,
          startedAt: latest.startedAt.toISOString(),
          completedAt: latest.completedAt?.toISOString() ?? null,
          asOfDate: formatBillingDateOnly(latest.asOfDate),
          summary: parseStoredSummary(latest.summaryJson) ?? {
            mode: latest.mode,
            trigger: latest.trigger,
            asOfDate: formatBillingDateOnly(latest.asOfDate),
            deliverAutomatically: latest.deliverAutomatically,
            contractsEvaluated: 0,
            invoicesCreated: 0,
            invoicesSent: 0,
            skipped: 0,
            blocked: 0,
            failed: 0,
            results: [],
          },
        }
      : null,
  };
}
