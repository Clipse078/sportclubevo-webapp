import {
  DEFAULT_DUNNING_GRACE_DAYS,
  isDunningExemptionActive,
} from "@/lib/billing/dunning-policy";
import { findBillingAccountByTenantId } from "@/lib/billing/tenant-billing-account-repository";
import type { TenantDunningPolicy } from "@/lib/billing/dunning-types";

export async function getTenantDunningPolicy(
  tenantId: string,
  now: Date = new Date(),
): Promise<TenantDunningPolicy> {
  const account = await findBillingAccountByTenantId(tenantId);
  const exemptUntil = account?.dunningExemptUntil ?? null;
  const exemptActive = isDunningExemptionActive(exemptUntil, now);

  return {
    enabled: account?.automaticDunningEnabled ?? true,
    graceDays: DEFAULT_DUNNING_GRACE_DAYS,
    exemptUntil: exemptUntil?.toISOString() ?? null,
    exemptActive,
  };
}
