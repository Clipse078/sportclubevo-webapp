import { prisma } from "@/lib/db/prisma";
import {
  resolveEffectiveTenantMatchDurationMinutes,
  validateTenantMatchDurationMinutes,
} from "./validation";

export type TenantMatchOperationalPolicyResolved = {
  /** Effective minutes used for automatic derivation (club config or platform fallback). */
  defaultMatchDurationMinutes: number;
  /** True when the value comes from persisted tenant configuration. */
  isClubConfigured: boolean;
};

export function mapTenantMatchOperationalPolicyRow(
  row: { defaultMatchDurationMinutes: number } | null,
): TenantMatchOperationalPolicyResolved {
  if (!row) {
    return {
      defaultMatchDurationMinutes: resolveEffectiveTenantMatchDurationMinutes(null),
      isClubConfigured: false,
    };
  }
  return {
    defaultMatchDurationMinutes: row.defaultMatchDurationMinutes,
    isClubConfigured: true,
  };
}

export async function getTenantMatchOperationalPolicy(
  tenantId: string,
): Promise<TenantMatchOperationalPolicyResolved> {
  const row = await prisma.tenantMatchOperationalPolicy.findUnique({
    where: { tenantId },
    select: { defaultMatchDurationMinutes: true },
  });
  return mapTenantMatchOperationalPolicyRow(row);
}

export async function upsertTenantMatchOperationalPolicy(
  tenantId: string,
  defaultMatchDurationMinutes: number,
): Promise<TenantMatchOperationalPolicyResolved> {
  const validated = validateTenantMatchDurationMinutes(defaultMatchDurationMinutes);
  const row = await prisma.tenantMatchOperationalPolicy.upsert({
    where: { tenantId },
    create: { tenantId, defaultMatchDurationMinutes: validated },
    update: { defaultMatchDurationMinutes: validated },
    select: { defaultMatchDurationMinutes: true },
  });
  return mapTenantMatchOperationalPolicyRow(row);
}
