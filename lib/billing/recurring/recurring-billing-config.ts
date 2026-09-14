export const RECURRING_BILLING_CRON_PATH = "/api/cron/recurring-billing";
export const RECURRING_BILLING_CRON_SCHEDULE_UTC = "30 2 * * *";

/** Daily evaluation at 02:30 UTC (see vercel.json). */
export function describeRecurringBillingScheduleHint(): string {
  return "Täglich 02:30 UTC (Vercel Cron)";
}

export function isRecurringBillingCronAutoDeliverEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.RECURRING_BILLING_CRON_AUTO_DELIVER?.trim() === "1";
}
