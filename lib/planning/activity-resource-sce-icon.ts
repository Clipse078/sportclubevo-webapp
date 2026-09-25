import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

/**
 * Canonical activity/resource → SCE master names for future operational adoption.
 * Domain enums remain authoritative; this module is mapping-only.
 */
export const ACTIVITY_RESOURCE_SCE_ICON_BY_KIND = {
  TRAINING: "training",
  MATCH: "match",
  TOURNAMENT: "tournament",
  TEAM: "team",
  SEASON: "season",
  STANDINGS: "standings",
  RESULTS: "results",
  ATTENDANCE: "attendance",
  PITCH: "pitch",
  DRESSING_ROOM: "dressing-room",
  DOCUMENT: "documents",
  TASK: "tasks",
  REQUIREMENT: "requirements",
  EVENT: "events",
} as const satisfies Record<string, SceIconRegistryName>;

export type ActivityResourceSceKind = keyof typeof ACTIVITY_RESOURCE_SCE_ICON_BY_KIND;
