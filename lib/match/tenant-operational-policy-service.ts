import {
  getTenantOperationalDurationPolicy,
  mapTenantOperationalDurationPolicyRow,
  upsertTenantOperationalDurationPolicy,
  type TenantOperationalDurationPolicyResolved,
} from "@/lib/operational/tenant-operational-duration-policy-service";
import { validateTenantMatchDurationMinutes } from "./validation";

export type TenantMatchOperationalPolicyResolved = {
  /** Effective minutes used for automatic derivation (club config or platform fallback). */
  defaultMatchDurationMinutes: number;
  /** True when the value comes from persisted tenant configuration. */
  isClubConfigured: boolean;
};

export function operationalPolicyToMatchResolved(
  policy: TenantOperationalDurationPolicyResolved,
): TenantMatchOperationalPolicyResolved {
  return {
    defaultMatchDurationMinutes: policy.MATCH.durationMinutes,
    isClubConfigured: policy.MATCH.isClubConfigured,
  };
}

/** @deprecated Prefer mapTenantOperationalDurationPolicyRow — kept for SCE-OPS-01A tests. */
export function mapTenantMatchOperationalPolicyRow(
  row: {
    defaultMatchDurationMinutes: number;
    defaultTrainingDurationMinutes?: number | null;
    defaultTournamentDurationMinutes?: number | null;
  } | null,
): TenantMatchOperationalPolicyResolved {
  const mapped = mapTenantOperationalDurationPolicyRow(
    row
      ? {
          defaultMatchDurationMinutes: row.defaultMatchDurationMinutes,
          defaultTrainingDurationMinutes: row.defaultTrainingDurationMinutes ?? null,
          defaultTournamentDurationMinutes: row.defaultTournamentDurationMinutes ?? null,
        }
      : null,
  );
  return operationalPolicyToMatchResolved(mapped);
}

export async function getTenantMatchOperationalPolicy(
  tenantId: string,
): Promise<TenantMatchOperationalPolicyResolved> {
  const policy = await getTenantOperationalDurationPolicy(tenantId);
  return operationalPolicyToMatchResolved(policy);
}

export async function upsertTenantMatchOperationalPolicy(
  tenantId: string,
  defaultMatchDurationMinutes: number,
): Promise<TenantMatchOperationalPolicyResolved> {
  const validated = validateTenantMatchDurationMinutes(defaultMatchDurationMinutes);
  const existing = await getTenantOperationalDurationPolicy(tenantId);
  const policy = await upsertTenantOperationalDurationPolicy(tenantId, {
    defaultMatchDurationMinutes: validated,
    defaultTrainingDurationMinutes: existing.TRAINING.durationMinutes,
    defaultTournamentDurationMinutes: existing.TOURNAMENT.durationMinutes,
  });
  return operationalPolicyToMatchResolved(policy);
}
