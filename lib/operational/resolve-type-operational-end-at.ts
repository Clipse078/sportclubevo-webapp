import { getEffectiveEndAt } from "@/lib/publishing/time/temporal-grouping";
import type { OperationalDurationKind } from "./defaults";
import {
  tenantOperationalPolicyToDefaultDurationsMinutes,
  type TenantOperationalDurationPolicyResolved,
} from "./map-tenant-operational-duration-policy";

/**
 * Effective operational end for TRAINING / TOURNAMENT (and other non-MATCH types
 * using duration fallbacks). Explicit meaningful endAt remains authoritative.
 */
export function resolveTypeOperationalEndAt(
  event: {
    readonly startAt: Date;
    readonly endAt: Date | null;
    readonly type: string;
  },
  kind: OperationalDurationKind,
  tenantPolicy?: TenantOperationalDurationPolicyResolved,
): Date {
  const durations = tenantPolicy
    ? tenantOperationalPolicyToDefaultDurationsMinutes(tenantPolicy)
    : undefined;

  return getEffectiveEndAt(
    { startAt: event.startAt, endAt: event.endAt, type: kind },
    durations,
  );
}
