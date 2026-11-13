/**
 * SCE-PLANNER-OPS-01 — Liste row operational menu capabilities (assign + change).
 */

import { deriveConflictResolutionCapabilities } from "@/lib/planning-hub/conflict-resolution";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import {
  canMutateResourceReservationForItem,
  type ManipulationActorPermissions,
} from "@/lib/planning-hub/manipulation-server-authorization";
import { canOpenPlanningHubItem } from "@/lib/planning-hub/planning-navigation-access";
import { canOpenPlannerCanonicalEditor, type PlannerCanonicalEditAccess } from "@/lib/planning-hub/planner-canonical-edit-access";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type PlanningHubListeMenuAction =
  | "details"
  | "edit"
  | "pitch"
  | "dressing"
  | "schedule"
  | "conflict";

export type PlanningHubListeMenuCapabilities = {
  showDetails: boolean;
  showEdit: boolean;
  showPitch: boolean;
  showDressing: boolean;
  showSchedule: boolean;
  showConflict: boolean;
  pitchLabel: string;
  dressingLabel: string;
  editBlockedReason: string | null;
  scheduleBlockedReason: string | null;
  pitchResourceId: string | null;
  dressingResourceId: string | null;
  pitchUsesManipulation: boolean;
  dressingUsesManipulation: boolean;
  editMenuLabel: string;
};

function actorFromCtx(
  ctx: Pick<ManipulationPermissionContext, "canManageTrainings" | "canManageEvents" | "canManageAllocations">,
): ManipulationActorPermissions {
  return {
    canManageTrainings: ctx.canManageTrainings,
    canManageEvents: ctx.canManageEvents,
    canManageAllocations: ctx.canManageAllocations,
  };
}

function primaryDressingResourceId(item: WeekplannerItem): string | null {
  return item.dressingRoomAllocations[0]?.facilityResourceId ?? null;
}

function canBearbeiten(
  item: WeekplannerItem,
  canEditItem: boolean,
  editAccess: PlannerCanonicalEditAccess | null,
): boolean {
  if (!canEditItem || !editAccess) return false;
  return canOpenPlannerCanonicalEditor(item, editAccess);
}

export function derivePlanningHubListeMenuCapabilities(options: {
  item: WeekplannerItem;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  > & {
    canViewTrainings?: boolean;
    canViewEvents?: boolean;
  };
  canEditItem: boolean;
  manipulationEnabled: boolean;
  plannerEditAccess: PlannerCanonicalEditAccess | null;
  alternativePlanActive: boolean;
}): PlanningHubListeMenuCapabilities {
  const { item, permissionContext, canEditItem, manipulationEnabled, plannerEditAccess, alternativePlanActive } =
    options;
  const actor = actorFromCtx(permissionContext);
  const caps = deriveConflictResolutionCapabilities(item, permissionContext, {
    canEditActivity: canEditItem,
  });
  const canResource = canMutateResourceReservationForItem(item, actor);

  const pitchResourceId = item.pitchAllocations[0]?.facilityResourceId ?? null;
  const dressingResourceId = primaryDressingResourceId(item);
  const pitchAllocated = pitchResourceId !== null;
  const dressingAllocated = dressingResourceId !== null;

  const showDetails = canOpenPlanningHubItem(item, {
    canViewTrainings: permissionContext.canViewTrainings ?? false,
    canManageTrainings: permissionContext.canManageTrainings,
    canViewEvents: permissionContext.canViewEvents ?? false,
    canManageEvents: permissionContext.canManageEvents,
  });

  const showEdit =
    !alternativePlanActive && canBearbeiten(item, canEditItem, plannerEditAccess);

  const showPitch =
    canResource && (alternativePlanActive ? canEditItem : showEdit || manipulationEnabled);

  const showDressing =
    item.type !== "TOURNAMENT" &&
    canResource &&
    (alternativePlanActive ? canEditItem : showEdit || manipulationEnabled);

  const showSchedule = caps.canMoveActivityTime && manipulationEnabled;
  const showConflict = item.conflicts.length > 0;

  const pitchUsesManipulation = pitchAllocated && manipulationEnabled && permissionContext.isStandardplan;
  const dressingUsesManipulation = dressingAllocated && manipulationEnabled && permissionContext.isStandardplan;

  const editMenuLabel =
    item.type === "VERANSTALTUNG" && showEdit ? "Ressourcen & Termin" : "Bearbeiten";

  const editBlockedReason = (() => {
    if (!canEditItem) return null;
    if (alternativePlanActive && !showEdit) {
      return "Betriebsplan-Overrides bearbeiten Sie im Betriebsplan-Editor — nicht inline in der Liste.";
    }
    if (!showEdit && item.type === "VERANSTALTUNG") {
      return "Veranstaltungs-Stammdaten bearbeiten Sie im Veranstaltungsbereich. Hier nur Zuweisen/Ändern nutzen.";
    }
    return null;
  })();

  return {
    showDetails,
    showEdit,
    showPitch,
    showDressing,
    showSchedule,
    showConflict,
    pitchLabel: pitchAllocated ? "Spielfeld ändern" : "Spielfeld zuweisen",
    dressingLabel: dressingAllocated ? "Garderobe ändern" : "Garderobe zuweisen",
    editBlockedReason,
    editMenuLabel,
    scheduleBlockedReason: caps.activityTimeBlockedReason,
    pitchResourceId,
    dressingResourceId,
    pitchUsesManipulation,
    dressingUsesManipulation,
  };
}
