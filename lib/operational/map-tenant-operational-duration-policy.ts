import {
  SCE_PLATFORM_DEFAULT_OPERATIONAL_DURATION_MINUTES,
  type OperationalDurationKind,
} from "./defaults";

export type OperationalDurationFieldResolved = {
  durationMinutes: number;
  isClubConfigured: boolean;
};

export type TenantOperationalDurationPolicyResolved = Record<
  OperationalDurationKind,
  OperationalDurationFieldResolved
>;

export type TenantOperationalDurationPolicyRow = {
  defaultMatchDurationMinutes: number;
  defaultTrainingDurationMinutes: number | null;
  defaultTournamentDurationMinutes: number | null;
};

function resolveField(
  kind: OperationalDurationKind,
  row: TenantOperationalDurationPolicyRow | null,
): OperationalDurationFieldResolved {
  const platform = SCE_PLATFORM_DEFAULT_OPERATIONAL_DURATION_MINUTES[kind];

  if (!row) {
    return { durationMinutes: platform, isClubConfigured: false };
  }

  if (kind === "MATCH") {
    return {
      durationMinutes: row.defaultMatchDurationMinutes,
      isClubConfigured: true,
    };
  }

  if (kind === "TRAINING") {
    if (row.defaultTrainingDurationMinutes == null) {
      return { durationMinutes: platform, isClubConfigured: false };
    }
    return {
      durationMinutes: row.defaultTrainingDurationMinutes,
      isClubConfigured: true,
    };
  }

  if (row.defaultTournamentDurationMinutes == null) {
    return { durationMinutes: platform, isClubConfigured: false };
  }
  return {
    durationMinutes: row.defaultTournamentDurationMinutes,
    isClubConfigured: true,
  };
}

export function mapTenantOperationalDurationPolicyRow(
  row: TenantOperationalDurationPolicyRow | null,
): TenantOperationalDurationPolicyResolved {
  return {
    MATCH: resolveField("MATCH", row),
    TRAINING: resolveField("TRAINING", row),
    TOURNAMENT: resolveField("TOURNAMENT", row),
  };
}

export function tenantOperationalPolicyToDefaultDurationsMinutes(
  policy: TenantOperationalDurationPolicyResolved,
): Record<string, number> {
  return {
    MATCH: policy.MATCH.durationMinutes,
    TRAINING: policy.TRAINING.durationMinutes,
    TOURNAMENT: policy.TOURNAMENT.durationMinutes,
  };
}
