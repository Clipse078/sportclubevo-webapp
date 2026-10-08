import type { WeekplannerItem } from "@/lib/weekplanner/types";

/** Permission inputs for Standardplan canonical editor (WeekplannerPlanningSheet). */
export type PlannerCanonicalEditAccess = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  canManageAllocations: boolean;
};

export function canDomainManagePlannerItem(
  item: WeekplannerItem,
  access: PlannerCanonicalEditAccess,
): boolean {
  if (item.type === "TRAINING") return access.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT" || item.type === "VERANSTALTUNG") {
    return access.canManageEvents;
  }
  return false;
}

export function canOperationalManagePlannerItem(
  item: WeekplannerItem,
  access: PlannerCanonicalEditAccess,
): boolean {
  if (!access.canManageAllocations) return false;
  return item.type === "TRAINING" || item.type === "MATCH" || item.type === "TOURNAMENT";
}

/** Open canonical sheet: domain manage or operational allocation manage (not Veranstaltung). */
export function canOpenPlannerCanonicalEditor(
  item: WeekplannerItem,
  access: PlannerCanonicalEditAccess,
): boolean {
  return canDomainManagePlannerItem(item, access) || canOperationalManagePlannerItem(item, access);
}
