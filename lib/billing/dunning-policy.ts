/**
 * SCE-SUPERADMIN-BILLING-01G — central dunning policy defaults.
 *
 * No commercial payment-term document exists in this repository; platform default
 * grace period is 14 calendar days from the first qualifying SCE-observed failure.
 */
export const DEFAULT_DUNNING_GRACE_DAYS = 14;

export const DUNNING_CRON_BATCH_SIZE = 50;

export function computeGracePeriodEnd(firstFailureAt: Date, graceDays: number): Date {
  const end = new Date(firstFailureAt.getTime());
  end.setUTCDate(end.getUTCDate() + graceDays);
  return end;
}

export function isDunningExemptionActive(
  exemptUntil: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!exemptUntil) {
    return false;
  }
  return exemptUntil.getTime() > now.getTime();
}
