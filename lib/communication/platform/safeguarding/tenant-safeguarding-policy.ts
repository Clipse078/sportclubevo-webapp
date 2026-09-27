/**
 * SCE-COMM-18 — tenant safeguarding policy load + conservative defaults.
 *
 * Defaults are product configuration for youth sports — not legal advice.
 */

import { prisma } from "@/lib/db/prisma";

export type TenantCommunicationSafeguardingPolicyConfig = {
  tenantId: string;
  safeguardingEnabled: boolean;
  minorAgeThresholdYears: number;
  allowDirectMinorDelivery: boolean;
  guardianVisibilityRequired: boolean;
  guardianOnlyDeliveryRequired: boolean;
  guardianResponseAuthorityEnabled: boolean;
  deliverToAllActiveGuardians: boolean;
};

export function defaultTenantCommunicationSafeguardingPolicy(
  tenantId: string,
): TenantCommunicationSafeguardingPolicyConfig {
  return {
    tenantId,
    safeguardingEnabled: true,
    minorAgeThresholdYears: 18,
    allowDirectMinorDelivery: false,
    guardianVisibilityRequired: true,
    guardianOnlyDeliveryRequired: true,
    guardianResponseAuthorityEnabled: true,
    deliverToAllActiveGuardians: true,
  };
}

export async function loadTenantCommunicationSafeguardingPolicy(
  tenantId: string,
): Promise<TenantCommunicationSafeguardingPolicyConfig> {
  const row = await prisma.tenantCommunicationSafeguardingPolicy.findUnique({
    where: { tenantId },
  });
  if (!row) {
    return defaultTenantCommunicationSafeguardingPolicy(tenantId);
  }
  return {
    tenantId: row.tenantId,
    safeguardingEnabled: row.safeguardingEnabled,
    minorAgeThresholdYears: row.minorAgeThresholdYears,
    allowDirectMinorDelivery: row.allowDirectMinorDelivery,
    guardianVisibilityRequired: row.guardianVisibilityRequired,
    guardianOnlyDeliveryRequired: row.guardianOnlyDeliveryRequired,
    guardianResponseAuthorityEnabled: row.guardianResponseAuthorityEnabled,
    deliverToAllActiveGuardians: row.deliverToAllActiveGuardians,
  };
}
