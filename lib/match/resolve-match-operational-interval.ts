import { isMeaningfulEventInterval } from "@/lib/facilities/resource-occupancy-window";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "./defaults";
import type { TenantMatchOperationalPolicyResolved } from "./tenant-operational-policy-service";

const MS_PER_MINUTE = 60_000;

export type MatchOperationalEndSource =
  | "AUTHORITATIVE"
  | "SCE_OVERRIDE"
  | "CONFIGURED_DEFAULT"
  | "PLATFORM_FALLBACK";

export type MatchOperationalDurationSource =
  | "AUTHORITATIVE"
  | "SCE_OVERRIDE"
  | "CLUB_DEFAULT"
  | "PLATFORM_DEFAULT";

export type MatchOperationalIntervalInput = {
  startAt: Date | string;
  authoritativeEndAt?: Date | string | null;
  operationalEndAtOverride?: Date | string | null;
  tenantPolicy?: TenantMatchOperationalPolicyResolved;
};

export type MatchOperationalInterval = {
  startAt: Date;
  endAt: Date;
  endSource: MatchOperationalEndSource;
  durationMinutes: number;
  durationSource: MatchOperationalDurationSource;
  isDerived: boolean;
  isOverride: boolean;
  /** False when start is invalid — callers treat as requiring manual action. */
  isResolvable: boolean;
};

function addMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * MS_PER_MINUTE);
}

function resolveConfiguredDurationMinutes(
  policy: TenantMatchOperationalPolicyResolved | undefined,
): { minutes: number; durationSource: MatchOperationalDurationSource; endSource: MatchOperationalEndSource } {
  if (policy?.isClubConfigured) {
    return {
      minutes: policy.defaultMatchDurationMinutes,
      durationSource: "CLUB_DEFAULT",
      endSource: "CONFIGURED_DEFAULT",
    };
  }
  const minutes = policy?.defaultMatchDurationMinutes ?? SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES;
  return {
    minutes,
    durationSource: "PLATFORM_DEFAULT",
    endSource: "PLATFORM_FALLBACK",
  };
}

/**
 * Canonical SCE operational interval for Matches — pure, no I/O.
 * Precedence: SCE override → meaningful authoritative end → club duration → platform fallback.
 */
export function resolveMatchOperationalInterval(
  input: MatchOperationalIntervalInput,
): MatchOperationalInterval {
  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) {
    return {
      startAt,
      endAt: startAt,
      endSource: "PLATFORM_FALLBACK",
      durationMinutes: 0,
      durationSource: "PLATFORM_DEFAULT",
      isDerived: false,
      isOverride: false,
      isResolvable: false,
    };
  }

  const overrideRaw = input.operationalEndAtOverride;
  if (overrideRaw != null && !(typeof overrideRaw === "string" && overrideRaw.trim() === "")) {
    const overrideEnd = new Date(overrideRaw);
    if (!Number.isNaN(overrideEnd.getTime()) && isMeaningfulEventInterval(startAt, overrideEnd)) {
      const durationMinutes = Math.round(
        (overrideEnd.getTime() - startAt.getTime()) / MS_PER_MINUTE,
      );
      return {
        startAt,
        endAt: overrideEnd,
        endSource: "SCE_OVERRIDE",
        durationMinutes,
        durationSource: "SCE_OVERRIDE",
        isDerived: false,
        isOverride: true,
        isResolvable: true,
      };
    }
  }

  const authRaw = input.authoritativeEndAt;
  if (authRaw != null && !(typeof authRaw === "string" && authRaw.trim() === "")) {
    const authEnd = new Date(authRaw);
    if (!Number.isNaN(authEnd.getTime()) && isMeaningfulEventInterval(startAt, authEnd)) {
      const durationMinutes = Math.round((authEnd.getTime() - startAt.getTime()) / MS_PER_MINUTE);
      return {
        startAt,
        endAt: authEnd,
        endSource: "AUTHORITATIVE",
        durationMinutes,
        durationSource: "AUTHORITATIVE",
        isDerived: false,
        isOverride: false,
        isResolvable: true,
      };
    }
  }

  const configured = resolveConfiguredDurationMinutes(input.tenantPolicy);
  const derivedEnd = addMinutes(startAt, configured.minutes);
  return {
    startAt,
    endAt: derivedEnd,
    endSource: configured.endSource,
    durationMinutes: configured.minutes,
    durationSource: configured.durationSource,
    isDerived: true,
    isOverride: false,
    isResolvable: true,
  };
}

export function matchTimingToOperationalInput(
  match: {
    startAt: Date | string;
    endAt?: Date | string | null;
    operationalEndAtOverride?: Date | string | null;
  },
  tenantPolicy?: TenantMatchOperationalPolicyResolved,
): MatchOperationalIntervalInput {
  return {
    startAt: match.startAt,
    authoritativeEndAt: match.endAt ?? null,
    operationalEndAtOverride: match.operationalEndAtOverride ?? null,
    tenantPolicy,
  };
}
