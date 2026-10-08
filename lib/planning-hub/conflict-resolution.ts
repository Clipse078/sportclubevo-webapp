/**
 * SCE-PLANNER-UX-08-05 — conflict resolution capabilities & workspace helpers.
 * Reuses canonical weekplanner conflict truth (no second detection engine).
 */

import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import { conflictIncidentSearchHaystack } from "@/lib/planning-hub/conflict-workspace-presenters";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import {
  canMutateActivityTimeForItem,
  canMutateResourceReservationForItem,
  type ManipulationActorPermissions,
} from "@/lib/planning-hub/manipulation-server-authorization";
import { resolveActivityScheduleAuthority } from "@/lib/planning-hub/planning-activity-rescheduling";
import type { WeekplannerConflict, WeekplannerItem } from "@/lib/weekplanner/types";
import {
  canOpenPlanningHubItem,
  type PlanningHubItemOpenAccess,
} from "@/lib/planning-hub/planning-navigation-access";

export type ConflictResolutionCapabilities = {
  canMoveActivityTime: boolean;
  canChangePrimaryResource: boolean;
  canChangeSupportingResource: boolean;
  canOpenActivity: boolean;
  canEditActivity: boolean;
  activityTimeBlockedReason: string | null;
};

export type ConflictResolutionFilterKind = "all" | "PITCH_HALL" | "DRESSING_ROOM";

export function actorFromManipulationContext(
  ctx: Pick<
    ManipulationPermissionContext,
    "canManageTrainings" | "canManageEvents" | "canManageAllocations"
  >,
): ManipulationActorPermissions {
  return {
    canManageTrainings: ctx.canManageTrainings,
    canManageEvents: ctx.canManageEvents,
    canManageAllocations: ctx.canManageAllocations,
  };
}

export function deriveConflictResolutionCapabilities(
  item: WeekplannerItem,
  ctx: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  > &
    Partial<PlanningHubItemOpenAccess>,
  options?: { canOpenActivity?: boolean; canEditActivity?: boolean },
): ConflictResolutionCapabilities {
  const actor = actorFromManipulationContext(ctx);
  const authority = resolveActivityScheduleAuthority(item, {
    isStandardplan: ctx.isStandardplan,
    alternativePlanId: ctx.alternativePlanId,
  });
  const canMoveActivityTime =
    canMutateActivityTimeForItem(item, actor) && authority.permitted;
  const canResource = canMutateResourceReservationForItem(item, actor);

  return {
    canMoveActivityTime,
    canChangePrimaryResource: canResource && item.pitchAllocations.length > 0,
    canChangeSupportingResource: canResource && hasAnyDressingAllocation(item),
    canOpenActivity:
      options?.canOpenActivity ??
      canOpenPlanningHubItem(item, {
        canViewTrainings: ctx.canViewTrainings ?? false,
        canManageTrainings: ctx.canManageTrainings,
        canViewEvents: ctx.canViewEvents ?? false,
        canManageEvents: ctx.canManageEvents,
      }),
    canEditActivity: options?.canEditActivity ?? (canMoveActivityTime || canResource),
    activityTimeBlockedReason:
      canMutateActivityTimeForItem(item, actor) && !authority.permitted
        ? authority.reason ?? "Die Spielzeit wird vom Verband verwaltet."
        : null,
  };
}

function hasAnyDressingAllocation(item: WeekplannerItem): boolean {
  if (item.dressingRoomAllocations.length > 0) return true;
  if (item.type === "MATCH" && item.awayDressingRoomAllocations.length > 0) return true;
  if (item.type === "TOURNAMENT") {
    return item.participantAllocations.some((p) => p.dressingRoomAllocations.length > 0);
  }
  return false;
}

export function conflictMatchesIncident(
  conflict: WeekplannerConflict,
  incident: PlanningConflictIncident,
): boolean {
  return (
    conflict.facilityResourceId === incident.facilityResourceId &&
    (conflict.resourceKind ?? inferConflictKind(conflict)) === incident.resourceKind
  );
}

function inferConflictKind(conflict: WeekplannerConflict): "PITCH_HALL" | "DRESSING_ROOM" {
  return conflict.resourceKind === "DRESSING_ROOM" ? "DRESSING_ROOM" : "PITCH_HALL";
}

export function conflictsForIncidentOnItem(
  item: WeekplannerItem,
  incident: PlanningConflictIncident,
): WeekplannerConflict[] {
  return item.conflicts.filter((c) => conflictMatchesIncident(c, incident));
}

export function filterConflictIncidents(
  incidents: readonly PlanningConflictIncident[],
  options: {
    query: string;
    kind: ConflictResolutionFilterKind;
    itemsById: Map<string, WeekplannerItem>;
  },
): PlanningConflictIncident[] {
  const q = options.query.trim().toLocaleLowerCase("de-CH");
  let list = [...incidents];
  if (options.kind !== "all") {
    list = list.filter((i) => i.resourceKind === options.kind);
  }
  if (q) {
    list = list.filter((incident) => conflictIncidentSearchHaystack(incident, options.itemsById).includes(q));
  }
  list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id));
  return list;
}

export function defaultActivityIdForIncident(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string | null {
  for (const id of incident.itemIds) {
    const item = itemsById.get(id);
    if (item && conflictsForIncidentOnItem(item, incident).length > 0) return id;
  }
  return incident.itemIds[0] ?? null;
}

export function segmentIdForResource(itemId: string, resourceId: string): string {
  return `${itemId}:${resourceId}`;
}

/** Canonical top-level count = deduplicated resource-overlap incidents (not per-activity markers). */
export function canonicalConflictIncidentTotal(incidents: readonly PlanningConflictIncident[]): number {
  return incidents.length;
}

export function countRemainingConflictsOnItem(item: WeekplannerItem): number {
  return item.conflicts.length;
}

export type ConflictResolutionFeedback =
  | { kind: "full"; message: "✓ Konflikt behoben" }
  | { kind: "partial"; resolvedLabel: string; remainingCount: number }
  | null;

export function buildConflictResolutionFeedback(
  itemBefore: WeekplannerItem | null,
  itemAfter: WeekplannerItem | null,
  resolvedConflict: WeekplannerConflict | null,
): ConflictResolutionFeedback {
  if (!itemBefore || !itemAfter || !resolvedConflict) return null;
  const before = itemBefore.conflicts.length;
  const after = itemAfter.conflicts.length;
  if (after >= before) return null;

  const resolvedKind =
    resolvedConflict.resourceKind === "DRESSING_ROOM" ? "Garderobenkonflikt" : "Spielfeldkonflikt";
  if (after === 0) {
    return { kind: "full", message: "✓ Konflikt behoben" };
  }
  return {
    kind: "partial",
    resolvedLabel: resolvedKind,
    remainingCount: after,
  };
}
