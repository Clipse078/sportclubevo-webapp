"use client";

import type { PlannerCanonicalEditAccess } from "@/lib/planning-hub/planner-canonical-edit-access";
import type { PlanningHubListeMenuAction } from "@/lib/planning-hub/liste-operational-menu";
import type { WeekplannerPlanningDomainEditAccess } from "@/components/admin/planner/WeekplannerPlanningSheet";

/** Liste row expansion + optional menu-driven focus inside the operational panel. */
export type PlanningHubListeInlineSession = {
  itemId: string;
  focus?: PlanningHubListeMenuAction | null;
} | null;

export function toDomainEditAccess(access: PlannerCanonicalEditAccess | null): WeekplannerPlanningDomainEditAccess {
  return {
    canManageTrainings: access?.canManageTrainings ?? false,
    canManageEvents: access?.canManageEvents ?? false,
  };
}
