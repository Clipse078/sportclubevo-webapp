import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";

/**
 * Logical governance capabilities — mapped onto existing SCE permission keys for
 * create authority. Approval uses dedicated future keys (not seeded in 01B-R3).
 */
export type SceActivityGovernanceCapability = "CREATE" | "APPROVE";

/**
 * Existing tenant permissions that imply activity **creation** authority today.
 * Publication mode is resolved separately via governance policy (01B-R3).
 */
export const SCE_ACTIVITY_CREATE_PERMISSION_BY_TYPE: Record<
  SceActivityCreateKind,
  readonly PermissionKey[]
> = {
  TRAINING: [PERMISSIONS.TRAININGS_MANAGE],
  MATCH: [PERMISSIONS.EVENTS_MANAGE],
  TOURNAMENT: [PERMISSIONS.EVENTS_MANAGE],
  CLUB_EVENT: [PERMISSIONS.EVENTS_MANAGE],
};

/**
 * Planned permission keys for validator assignment (01C+ admin UI + RPERM seed).
 * Not added to `PERMISSIONS` / Prisma in foundation-only R3.
 */
export const SCE_ACTIVITY_APPROVE_PERMISSION_BY_TYPE: Record<
  SceActivityCreateKind,
  PermissionKey | null
> = {
  TRAINING: null,
  MATCH: null,
  TOURNAMENT: null,
  CLUB_EVENT: PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE,
};

/** @deprecated Use SCE_ACTIVITY_APPROVE_PERMISSION_BY_TYPE — kept for contract docs. */
export const SCE_ACTIVITY_APPROVE_PERMISSION_PLANNED_BY_TYPE: Record<
  SceActivityCreateKind,
  string
> = {
  TRAINING: "activities.training.approve",
  MATCH: "activities.match.approve",
  TOURNAMENT: "activities.tournament.approve",
  CLUB_EVENT: PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE,
};

export function personHasAnyPermission(
  held: ReadonlySet<PermissionKey>,
  keys: readonly PermissionKey[],
): boolean {
  return keys.some((key) => held.has(key));
}

export function resolveCreatePermissionKeysForActivityType(
  activityType: SceActivityCreateKind,
): readonly PermissionKey[] {
  return SCE_ACTIVITY_CREATE_PERMISSION_BY_TYPE[activityType];
}
