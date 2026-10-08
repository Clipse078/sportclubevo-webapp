import type { WeekplannerItem } from "@/lib/weekplanner/types";

/** Permission inputs for cross-module Planning Hub «Öffnen» navigation. */
export type PlanningHubItemOpenAccess = {
  canViewTrainings: boolean;
  canManageTrainings: boolean;
  canViewEvents: boolean;
  canManageEvents: boolean;
};

export function canOpenPlanningHubItem(
  item: WeekplannerItem,
  access: PlanningHubItemOpenAccess,
): boolean {
  switch (item.type) {
    case "TRAINING":
      return access.canViewTrainings || access.canManageTrainings;
    case "MATCH":
    case "TOURNAMENT":
    case "VERANSTALTUNG":
      return access.canViewEvents || access.canManageEvents;
    default:
      return false;
  }
}

export function planningHubItemOpenAccessFromFlags(flags: {
  canViewTrainings: boolean;
  canManageTrainings: boolean;
  canViewEvents: boolean;
  canManageEvents: boolean;
}): PlanningHubItemOpenAccess {
  return flags;
}
