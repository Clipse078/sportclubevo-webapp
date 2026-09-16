import { computeResourceOccupancyWindow } from "@/lib/facilities/resource-occupancy-window";
import { PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS } from "./defaults";
import type {
  DressingRoomOccupancyActivityType,
  DressingRoomOccupancyMode,
  EventDressingRoomOccupancyOverride,
  ResolvedDressingRoomOccupancy,
  TenantDressingRoomOccupancyPresets,
} from "./types";

export function presetForActivityType(
  presets: TenantDressingRoomOccupancyPresets,
  activityType: DressingRoomOccupancyActivityType,
): { beforeMinutes: number; afterMinutes: number } {
  if (activityType === "TRAINING") return presets.training;
  if (activityType === "MATCH") return presets.match;
  return presets.tournament;
}

export function eventOverrideFromPersistence(input: {
  mode: DressingRoomOccupancyMode;
  beforeMinutes: number | null;
  afterMinutes: number | null;
}): EventDressingRoomOccupancyOverride {
  return {
    mode: input.mode,
    beforeMinutes: input.beforeMinutes,
    afterMinutes: input.afterMinutes,
  };
}

export function defaultEventOverride(): EventDressingRoomOccupancyOverride {
  return { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null };
}

/**
 * Canonical dressing-room occupancy resolver — single interpretation for
 * conflict detection, planner geometry, and forms.
 */
export function resolveDressingRoomOccupancy(input: {
  activityType: DressingRoomOccupancyActivityType;
  activityStart: Date;
  activityEnd: Date;
  tenantPresets?: TenantDressingRoomOccupancyPresets;
  eventOverride?: EventDressingRoomOccupancyOverride;
}): ResolvedDressingRoomOccupancy {
  const presets = input.tenantPresets ?? PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS;
  const override = input.eventOverride ?? defaultEventOverride();
  const tenantPreset = presetForActivityType(presets, input.activityType);

  const mode = override.mode;
  const beforeMinutes =
    mode === "CUSTOM" && override.beforeMinutes !== null
      ? override.beforeMinutes
      : tenantPreset.beforeMinutes;
  const afterMinutes =
    mode === "CUSTOM" && override.afterMinutes !== null
      ? override.afterMinutes
      : tenantPreset.afterMinutes;

  const window = computeResourceOccupancyWindow(
    input.activityStart,
    input.activityEnd,
    beforeMinutes,
    afterMinutes,
  );

  return {
    mode,
    beforeMinutes: window.beforeMinutes,
    afterMinutes: window.afterMinutes,
    effectiveStart: window.effectiveStartAt,
    effectiveEnd: window.effectiveEndAt,
  };
}
