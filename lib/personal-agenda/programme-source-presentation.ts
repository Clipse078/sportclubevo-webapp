import type { PersonalProgrammeSourceType } from "./personal-programme-types";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import { resolvePersonalCalendarDayMarkerSlots } from "./personal-calendar-day-marker-slots";

/** Stable semantic palette keys for tests (not CSS snapshots). */
export type ProgrammeSourcePaletteKey =
  | "training-blue"
  | "match-red"
  | "tournament-orange"
  | "event-violet"
  | "meeting-cyan";

export type ProgrammeSourcePresentation = {
  sourceType: PersonalProgrammeSourceType;
  paletteKey: ProgrammeSourcePaletteKey;
  /** Compact bar / timeline dot accent */
  markerAccentClass: string;
  /** Low-intensity day-cell wash (personal calendar) */
  dayTintClass: string;
  /** Single-event in-cell chip */
  chipTintClass: string;
  chipBorderClass: string;
  chipTextClass: string;
};

const PRESENTATION_BY_SOURCE: Record<PersonalProgrammeSourceType, ProgrammeSourcePresentation> = {
  TRAINING: {
    sourceType: "TRAINING",
    paletteKey: "training-blue",
    markerAccentClass: "bg-[var(--sce-info)]",
    dayTintClass: "bg-[var(--sce-info-light)]",
    chipTintClass: "bg-[var(--sce-info-light)]",
    chipBorderClass: "border-[color-mix(in_srgb,var(--sce-info)_35%,var(--border))]",
    chipTextClass: "text-[color-mix(in_srgb,var(--sce-info)_90%,var(--foreground)_10%)]",
  },
  MATCH: {
    sourceType: "MATCH",
    paletteKey: "match-red",
    markerAccentClass: "bg-[var(--sce-secondary)]",
    dayTintClass: "bg-[var(--sce-secondary-light)]",
    chipTintClass: "bg-[var(--sce-secondary-light)]",
    chipBorderClass: "border-[color-mix(in_srgb,var(--sce-secondary)_35%,var(--border))]",
    chipTextClass: "text-[color-mix(in_srgb,var(--sce-secondary)_88%,var(--foreground)_12%)]",
  },
  TOURNAMENT: {
    sourceType: "TOURNAMENT",
    paletteKey: "tournament-orange",
    markerAccentClass: "bg-[var(--sce-primary)]",
    dayTintClass: "bg-[var(--sce-primary-light)]",
    chipTintClass: "bg-[var(--sce-primary-light)]",
    chipBorderClass: "border-[color-mix(in_srgb,var(--sce-primary)_35%,var(--border))]",
    chipTextClass: "text-[color-mix(in_srgb,var(--sce-primary)_92%,var(--foreground)_8%)]",
  },
  EVENT: {
    sourceType: "EVENT",
    paletteKey: "event-violet",
    markerAccentClass: "bg-violet-500 dark:bg-violet-400",
    dayTintClass: "bg-violet-500/10 dark:bg-violet-400/12",
    chipTintClass: "bg-violet-500/10 dark:bg-violet-400/12",
    chipBorderClass: "border-violet-500/30 dark:border-violet-400/35",
    chipTextClass: "text-violet-700 dark:text-violet-300",
  },
  MEETING: {
    sourceType: "MEETING",
    paletteKey: "meeting-cyan",
    markerAccentClass: "bg-teal-500 dark:bg-teal-400",
    dayTintClass: "bg-teal-500/10 dark:bg-teal-400/12",
    chipTintClass: "bg-teal-500/10 dark:bg-teal-400/12",
    chipBorderClass: "border-teal-500/30 dark:border-teal-400/35",
    chipTextClass: "text-teal-800 dark:text-teal-300",
  },
};

export function getProgrammeSourcePresentation(
  sourceType: PersonalProgrammeSourceType,
): ProgrammeSourcePresentation {
  return PRESENTATION_BY_SOURCE[sourceType];
}

export type PersonalProgrammeDayActivityMarkers = {
  /** Up to three semantic slots (may repeat types). */
  markerSourceTypes: PersonalProgrammeSourceType[];
  /** Additional authorized items beyond visible marker slots (+N). */
  overflowCount: number;
};

/**
 * Builds bounded semantic markers for a calendar day from authorized programme items.
 * `activityCount` may include non-programme overlays (e.g. tasks on Kalender page).
 */
export function buildPersonalProgrammeDayActivityMarkers(
  dayItems: readonly PersonalProgrammeItem[],
  activityCount: number,
): PersonalProgrammeDayActivityMarkers {
  const sorted = sortPersonalProgrammeItems([...dayItems]);
  const { markerSlots, overflowCount } = resolvePersonalCalendarDayMarkerSlots(
    sorted.map((item) => item.sourceType),
    activityCount,
  );
  return { markerSourceTypes: markerSlots, overflowCount };
}
