/**
 * lib/publishing/time/publishing-effective-end-at.ts
 *
 * Publishing-layer effective end times. Infoboard temporal grouping must align
 * with SCE-OPS-01A Match operational intervals (override → authoritative end →
 * club default → platform fallback), not legacy fixed-duration heuristics.
 */

import {
  matchTimingToOperationalInput,
  resolveMatchOperationalInterval,
} from "@/lib/match/resolve-match-operational-interval";
import { operationalPolicyToMatchResolved } from "@/lib/match/tenant-operational-policy-service";
import type { TenantMatchOperationalPolicyResolved } from "@/lib/match/tenant-operational-policy-service";
import { resolveTypeOperationalEndAt } from "@/lib/operational/resolve-type-operational-end-at";
import type { TenantOperationalDurationPolicyResolved } from "@/lib/operational/tenant-operational-duration-policy-service";
import { getEffectiveEndAt } from "./temporal-grouping";

export type PublishingEffectiveEndSourceEvent = {
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly type: string;
  /** Provider / authoritative Event.endAt for MATCH — when set on source events. */
  readonly authoritativeEndAt?: Date | null;
  readonly operationalEndAtOverride?: Date | null;
};

export type PublishingEffectiveEndContext = {
  readonly matchOperationalPolicy?: TenantMatchOperationalPolicyResolved;
  /** SCE-OPS-01B — tenant TRAINING / TOURNAMENT duration defaults (one load per request). */
  readonly operationalDurationPolicy?: TenantOperationalDurationPolicyResolved;
};

/**
 * Resolves the operational end instant used for Infoboard temporal grouping.
 *
 * MATCH events use the canonical SCE operational interval resolver when the
 * explicit `endAt` is absent or not meaningful. Other event types delegate to
 * `getEffectiveEndAt()` (training / tournament / OTHER defaults unchanged).
 */
export function getPublishingEffectiveEndAt(
  event: PublishingEffectiveEndSourceEvent,
  context?: PublishingEffectiveEndContext,
): Date {
  const operationalDurationPolicy = context?.operationalDurationPolicy;
  const matchPolicy =
    context?.matchOperationalPolicy ??
    (operationalDurationPolicy
      ? operationalPolicyToMatchResolved(operationalDurationPolicy)
      : undefined);

  if (event.type === "MATCH") {
    if (event.endAt !== null && event.endAt.getTime() > event.startAt.getTime()) {
      return event.endAt;
    }

    const interval = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        {
          startAt: event.startAt,
          endAt: event.authoritativeEndAt ?? event.endAt ?? null,
          operationalEndAtOverride: event.operationalEndAtOverride ?? null,
        },
        matchPolicy,
      ),
    );
    return interval.endAt;
  }

  if (event.type === "TRAINING" && operationalDurationPolicy) {
    return resolveTypeOperationalEndAt(event, "TRAINING", operationalDurationPolicy);
  }

  if (event.type === "TOURNAMENT" && operationalDurationPolicy) {
    return resolveTypeOperationalEndAt(event, "TOURNAMENT", operationalDurationPolicy);
  }

  return getEffectiveEndAt(event);
}
