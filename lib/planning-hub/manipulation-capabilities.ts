import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type SchedulerManipulationCapabilities = {
  canMoveTime: boolean;
  canResize: boolean;
  canChangePrimaryResource: boolean;
  canChangeDressingRoom: boolean;
};

export type ManipulationPermissionContext = {
  isStandardplan: boolean;
  canManageTrainings: boolean;
  canManageEvents: boolean;
  /** Alternative plan — operational overrides permitted when set. */
  alternativePlanId: string | null;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
};

const NONE: SchedulerManipulationCapabilities = {
  canMoveTime: false,
  canResize: false,
  canChangePrimaryResource: false,
  canChangeDressingRoom: false,
};

function canManageItem(
  item: WeekplannerItem,
  ctx: ManipulationPermissionContext,
): boolean {
  if (item.type === "VERANSTALTUNG") return false;
  if (item.type === "TRAINING") return ctx.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT") return ctx.canManageEvents;
  return false;
}

/**
 * Explicit capability matrix derived from canonical mutation support (not visual similarity).
 */
export function getSchedulerManipulationCapabilities(
  item: WeekplannerItem,
  ctx: ManipulationPermissionContext,
): SchedulerManipulationCapabilities {
  if (!canManageItem(item, ctx)) return NONE;

  if (ctx.isStandardplan) {
    if (item.type === "TRAINING") {
      return {
        canMoveTime: true,
        canResize: true,
        canChangePrimaryResource: ctx.resourceCategory === "pitch",
        canChangeDressingRoom: ctx.resourceCategory === "dressing",
      };
    }
    if (item.type === "MATCH") {
      return {
        canMoveTime: false,
        canResize: false,
        canChangePrimaryResource: ctx.resourceCategory === "pitch",
        canChangeDressingRoom: ctx.resourceCategory === "dressing",
      };
    }
    if (item.type === "TOURNAMENT") {
      return {
        canMoveTime: false,
        canResize: false,
        canChangePrimaryResource: ctx.resourceCategory === "pitch",
        canChangeDressingRoom: false,
      };
    }
    return NONE;
  }

  if (!ctx.alternativePlanId) return NONE;

  if (item.type === "TRAINING" || item.type === "MATCH" || item.type === "TOURNAMENT") {
    return {
      canMoveTime: true,
      canResize: true,
      canChangePrimaryResource: ctx.resourceCategory === "pitch",
      canChangeDressingRoom:
        ctx.resourceCategory === "dressing" && (item.type === "TRAINING" || item.type === "MATCH"),
    };
  }

  return NONE;
}

export function hasAnyManipulationCapability(caps: SchedulerManipulationCapabilities): boolean {
  return caps.canMoveTime || caps.canResize || caps.canChangePrimaryResource || caps.canChangeDressingRoom;
}
