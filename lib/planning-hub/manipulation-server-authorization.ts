/**
 * SCE-PLANNER-UX-08-04 — shared activity-time vs resource-reservation permission model.
 * Used by client capability matrix and planning-hub validate routes (live resolver on server).
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type ManipulationActorPermissions = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  canManageAllocations: boolean;
};

export class ManipulationForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManipulationForbiddenError";
  }
}

/** User-facing message when mutation is denied (no permission keys in copy). */
export const MANIPULATION_PERMISSION_DENIED_MESSAGE =
  "Du hast keine Berechtigung mehr, diese Planung zu ändern.";

export function manipulationPermissionFlagsFromKeys(
  permissionKeys: readonly PermissionKey[],
): ManipulationActorPermissions {
  const set = new Set(permissionKeys);
  return {
    canManageTrainings: set.has(PERMISSIONS.TRAININGS_MANAGE),
    canManageEvents: set.has(PERMISSIONS.EVENTS_MANAGE),
    canManageAllocations: set.has(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE),
  };
}

export function canMutateActivityTimeForItem(
  item: WeekplannerItem,
  actor: ManipulationActorPermissions,
): boolean {
  if (item.type === "VERANSTALTUNG") return false;
  if (item.type === "TRAINING") return actor.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT") return actor.canManageEvents;
  return false;
}

/** Resource reservation / occupancy — distinct from sporting activity time. */
export function canMutateResourceReservationForItem(
  item: WeekplannerItem,
  actor: ManipulationActorPermissions,
): boolean {
  if (item.type === "VERANSTALTUNG") return false;
  if (actor.canManageAllocations) return true;
  if (item.type === "TRAINING") return actor.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT") return actor.canManageEvents;
  return false;
}

export function assertManipulationTenantScope(
  item: WeekplannerItem,
  activeTenantId: string | null | undefined,
): void {
  if (!activeTenantId || item.tenantId !== activeTenantId) {
    throw new ManipulationForbiddenError(MANIPULATION_PERMISSION_DENIED_MESSAGE);
  }
}

export function assertActivityTimeMutationPermitted(
  item: WeekplannerItem,
  actor: ManipulationActorPermissions,
): void {
  if (!canMutateActivityTimeForItem(item, actor)) {
    throw new ManipulationForbiddenError(MANIPULATION_PERMISSION_DENIED_MESSAGE);
  }
}

export function assertResourceReservationMutationPermitted(
  item: WeekplannerItem,
  actor: ManipulationActorPermissions,
): void {
  if (!canMutateResourceReservationForItem(item, actor)) {
    throw new ManipulationForbiddenError(MANIPULATION_PERMISSION_DENIED_MESSAGE);
  }
}

export function formatManipulationHttpError(status: number, bodyError?: string | null): string {
  if (status === 403) {
    return bodyError && !bodyError.toLowerCase().includes("forbidden")
      ? bodyError
      : MANIPULATION_PERMISSION_DENIED_MESSAGE;
  }
  if (bodyError?.trim()) return bodyError.trim();
  if (status === 401) return "Bitte melde dich erneut an.";
  return "Speichern fehlgeschlagen.";
}
