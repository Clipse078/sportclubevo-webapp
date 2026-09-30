import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

/** Read plan allocations, conflicts, and availability without event/training manage. */
export const PLANNING_ALLOCATIONS_VIEW_PERMISSIONS = [
  PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
  PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_VIEW,
  PERMISSIONS.EVENTS_MANAGE,
] as const satisfies readonly PermissionKey[];

/** Mutate pitch/dressing-room allocations without full planning manage. */
export const PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS = [
  PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_MANAGE,
] as const satisfies readonly PermissionKey[];

/** Weekplanner / legacy match allocation writes (excludes wochenplan.publish). */
export const PLANNING_ALLOCATIONS_WRITE_PERMISSIONS = [
  PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
] as const satisfies readonly PermissionKey[];
