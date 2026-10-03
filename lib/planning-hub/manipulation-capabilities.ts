import type { PlanningHubManipulationSurface } from "@/lib/planning-hub/planner-perspective";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type SchedulerManipulationCapabilities = {
  /** Kalender — official activity interval. */
  canMoveTime: boolean;
  canResize: boolean;
  canChangePrimaryResource: boolean;
  canChangeDressingRoom: boolean;
  /** Resource timeline — reservation window (not sporting activity time). */
  canMoveResourceOccupancy: boolean;
  canChangeResourceOccupancyStart: boolean;
  canChangeResourceOccupancyEnd: boolean;
};

export type ManipulationPermissionContext = {
  isStandardplan: boolean;
  canManageTrainings: boolean;
  canManageEvents: boolean;
  /** Alternative plan — operational overrides permitted when set. */
  alternativePlanId: string | null;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  manipulationSurface: PlanningHubManipulationSurface;
};

const NONE: SchedulerManipulationCapabilities = {
  canMoveTime: false,
  canResize: false,
  canChangePrimaryResource: false,
  canChangeDressingRoom: false,
  canMoveResourceOccupancy: false,
  canChangeResourceOccupancyStart: false,
  canChangeResourceOccupancyEnd: false,
};

function resourceOccupancyCaps(enabled: boolean): Pick<
  SchedulerManipulationCapabilities,
  "canMoveResourceOccupancy" | "canChangeResourceOccupancyStart" | "canChangeResourceOccupancyEnd"
> {
  return {
    canMoveResourceOccupancy: enabled,
    canChangeResourceOccupancyStart: enabled,
    canChangeResourceOccupancyEnd: enabled,
  };
}

function canManageItem(
  item: WeekplannerItem,
  ctx: ManipulationPermissionContext,
): boolean {
  if (item.type === "VERANSTALTUNG") return false;
  if (item.type === "TRAINING") return ctx.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT") return ctx.canManageEvents;
  return false;
}

function resourceTimelineCaps(
  ctx: ManipulationPermissionContext,
  canChangeResource: boolean,
): Pick<
  SchedulerManipulationCapabilities,
  | "canMoveTime"
  | "canResize"
  | "canChangePrimaryResource"
  | "canChangeDressingRoom"
  | "canMoveResourceOccupancy"
  | "canChangeResourceOccupancyStart"
  | "canChangeResourceOccupancyEnd"
> {
  if (ctx.manipulationSurface !== "resourceTimeline") {
    return {
      canMoveTime: false,
      canResize: false,
      canChangePrimaryResource: false,
      canChangeDressingRoom: false,
      ...resourceOccupancyCaps(false),
    };
  }
  const pitch = ctx.resourceCategory === "pitch";
  const dressing = ctx.resourceCategory === "dressing";
  return {
    canMoveTime: false,
    canResize: false,
    canChangePrimaryResource: pitch && canChangeResource,
    canChangeDressingRoom: dressing && canChangeResource,
    ...resourceOccupancyCaps(canChangeResource),
  };
}

function calendarCaps(
  ctx: ManipulationPermissionContext,
  canMoveActivity: boolean,
  canResizeActivity: boolean,
): Pick<
  SchedulerManipulationCapabilities,
  | "canMoveTime"
  | "canResize"
  | "canChangePrimaryResource"
  | "canChangeDressingRoom"
  | "canMoveResourceOccupancy"
  | "canChangeResourceOccupancyStart"
  | "canChangeResourceOccupancyEnd"
> {
  if (ctx.manipulationSurface !== "kalender") {
    return {
      canMoveTime: false,
      canResize: false,
      canChangePrimaryResource: false,
      canChangeDressingRoom: false,
      ...resourceOccupancyCaps(false),
    };
  }
  return {
    canMoveTime: canMoveActivity,
    canResize: canResizeActivity,
    canChangePrimaryResource: false,
    canChangeDressingRoom: false,
    ...resourceOccupancyCaps(false),
  };
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
      const onResource = ctx.manipulationSurface === "resourceTimeline";
      if (onResource) {
        return {
          ...resourceTimelineCaps(ctx, true),
        };
      }
      return {
        ...calendarCaps(ctx, true, true),
      };
    }
    if (item.type === "MATCH") {
      const onResource = ctx.manipulationSurface === "resourceTimeline";
      if (onResource) {
        return {
          ...resourceTimelineCaps(ctx, true),
        };
      }
      return {
        ...calendarCaps(ctx, false, false),
      };
    }
    if (item.type === "TOURNAMENT") {
      const onResource = ctx.manipulationSurface === "resourceTimeline";
      if (onResource) {
        return {
          ...resourceTimelineCaps(ctx, ctx.resourceCategory === "pitch"),
        };
      }
      return {
        ...calendarCaps(ctx, false, false),
      };
    }
    return NONE;
  }

  if (!ctx.alternativePlanId) return NONE;

  if (item.type === "TRAINING" || item.type === "MATCH" || item.type === "TOURNAMENT") {
    const onResource = ctx.manipulationSurface === "resourceTimeline";
    const dressingRoomChange =
      ctx.resourceCategory === "dressing" && (item.type === "TRAINING" || item.type === "MATCH");
    if (onResource) {
      return {
        ...resourceTimelineCaps(ctx, dressingRoomChange || ctx.resourceCategory === "pitch"),
      };
    }
    return {
      ...calendarCaps(ctx, true, true),
    };
  }

  return NONE;
}

export function hasAnyManipulationCapability(caps: SchedulerManipulationCapabilities): boolean {
  return (
    caps.canMoveTime ||
    caps.canResize ||
    caps.canChangePrimaryResource ||
    caps.canChangeDressingRoom ||
    caps.canMoveResourceOccupancy ||
    caps.canChangeResourceOccupancyStart ||
    caps.canChangeResourceOccupancyEnd
  );
}
