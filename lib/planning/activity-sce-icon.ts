import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import type { PersonalProgrammeSourceType } from "@/lib/personal-agenda/personal-programme-types";
import type { WeekplannerItemType } from "@/lib/weekplanner/types";

/** Canonical operational activity kinds that use approved SCE hero masters. */
export const OPERATIONAL_ACTIVITY_SCE_KINDS = ["TRAINING", "MATCH", "TOURNAMENT"] as const;

export type OperationalActivitySceKind = (typeof OPERATIONAL_ACTIVITY_SCE_KINDS)[number];

export const ACTIVITY_SCE_ICON_BY_KIND = {
  TRAINING: "training",
  MATCH: "match",
  TOURNAMENT: "tournament",
} as const satisfies Record<OperationalActivitySceKind, SceIconRegistryName>;

export function isOperationalActivitySceKind(
  value: string | null | undefined,
): value is OperationalActivitySceKind {
  if (!value) return false;
  return (OPERATIONAL_ACTIVITY_SCE_KINDS as readonly string[]).includes(value);
}

/**
 * Maps a canonical activity kind string to an approved SCE registry name.
 * Returns null for unsupported kinds (events, meetings, veranstaltungen, etc.).
 */
export function getActivitySceIconName(
  activityKind: string | null | undefined,
): SceIconRegistryName | null {
  if (!isOperationalActivitySceKind(activityKind)) {
    return null;
  }
  return ACTIVITY_SCE_ICON_BY_KIND[activityKind];
}

export function getProgrammeSourceActivitySceIconName(
  sourceType: PersonalProgrammeSourceType,
): SceIconRegistryName | null {
  return getActivitySceIconName(sourceType);
}

export function getWeekplannerActivitySceIconName(
  type: WeekplannerItemType,
): SceIconRegistryName | null {
  return getActivitySceIconName(type);
}
