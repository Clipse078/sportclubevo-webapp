/**
 * Cross-domain operational resource assignment (pitch / Garderobe) for Spielbetrieb.
 *
 * Canonical write permission: planning.allocations.manage (tenant-wide).
 * Domain manage permissions (trainings.manage / events.manage) remain full coordinators.
 */

import type { Session } from "next-auth";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/** Locally managed match operational fields (not provider-authoritative facts). */
export const MATCH_OPERATIONAL_ALLOCATION_PATCH_KEYS = [
  "pitchCode",
  "homeDressingRoomCode",
  "awayDressingRoomCode",
  "dressingRoomOccupancyMode",
  "dressingRoomBeforeMinutes",
  "dressingRoomAfterMinutes",
] as const;

export type MatchPatchClassification =
  | "empty"
  | "operational_allocation_only"
  | "includes_non_operational";

export function classifyMatchOperationalPatch(
  body: Record<string, unknown>,
): MatchPatchClassification {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) return "empty";
  const allocationOnly = keys.every((k) =>
    (MATCH_OPERATIONAL_ALLOCATION_PATCH_KEYS as readonly string[]).includes(k),
  );
  return allocationOnly ? "operational_allocation_only" : "includes_non_operational";
}

export function sessionHasPlanningOperationalAllocationManage(session: Session | null): boolean {
  return hasPermission(session, PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
}

/** UI/API: may mutate pitch & dressing-room assignments (not full domain manage). */
export function canManageOperationalResourceAssignments(session: Session | null): boolean {
  return (
    sessionHasPlanningOperationalAllocationManage(session) ||
    hasPermission(session, PERMISSIONS.TRAININGS_MANAGE) ||
    hasPermission(session, PERMISSIONS.EVENTS_MANAGE)
  );
}
