import type { TenantBillingAccountRecord } from "@/lib/billing/tenant-billing-account-types";
import type { TenantDunningSnapshot } from "@/lib/billing/dunning-types";
import { isDunningExemptionActive } from "@/lib/billing/dunning-policy";
import type { BillingDunningStatus } from "@prisma/client";

export function resolveEffectiveDunningStatus(
  account: Pick<
    TenantBillingAccountRecord,
    "dunningStatus" | "dunningExemptUntil"
  >,
  now: Date = new Date(),
): BillingDunningStatus {
  if (isDunningExemptionActive(account.dunningExemptUntil, now)) {
    return "EXEMPT";
  }
  return account.dunningStatus;
}

export function toDunningSnapshot(
  account: TenantBillingAccountRecord,
  reconciliationRequired: boolean,
  now: Date = new Date(),
): TenantDunningSnapshot {
  return {
    tenantId: account.tenantId,
    dunningStatus: resolveEffectiveDunningStatus(account, now),
    firstPaymentFailureAt: account.firstPaymentFailureAt?.toISOString() ?? null,
    latestPaymentFailureAt: account.latestPaymentFailureAt?.toISOString() ?? null,
    gracePeriodEndsAt: account.gracePeriodEndsAt?.toISOString() ?? null,
    automaticallySuspendedAt: account.automaticallySuspendedAt?.toISOString() ?? null,
    resolvedAt: account.resolvedAt?.toISOString() ?? null,
    lastDunningEventAt: account.lastDunningEventAt?.toISOString() ?? null,
    dunningExemptUntil: account.dunningExemptUntil?.toISOString() ?? null,
    dunningExemptNote: account.dunningExemptNote ?? null,
    automaticDunningEnabled: account.automaticDunningEnabled,
    reconciliationRequired,
  };
}
