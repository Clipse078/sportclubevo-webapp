import type { PersonalProgrammeSourceType } from "./personal-programme-types";

/** Canonical marker priority (same family as compact mobile markers). */
export const PERSONAL_CALENDAR_MARKER_ORDER: readonly PersonalProgrammeSourceType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
] as const;

export const PERSONAL_CALENDAR_MAX_VISIBLE_MARKERS = 3;

export type PersonalCalendarDayMarkerSlots = {
  /** Up to three semantic slots (may repeat the same source type). */
  markerSlots: PersonalProgrammeSourceType[];
  /** Remaining authorized activities beyond visible slots (+N). */
  overflowCount: number;
};

/**
 * Deterministic type-aware marker fill for personal calendar month cells.
 *
 * Strategy (documented for SCE-CALENDAR-UX-02):
 * 1. Count activities per canonical source type.
 * 2. Round-robin allocate marker slots (max 3) across types with remaining count,
 *    visiting types in PERSONAL_CALENDAR_MARKER_ORDER each pass.
 * 3. overflowCount = totalActivityCount - markerSlots.length.
 *
 * Examples:
 * - 2× TRAINING + 1× MATCH → [TRAINING, MATCH, TRAINING]
 * - 4× TRAINING only → [TRAINING, TRAINING, TRAINING], overflow 1
 * - 4× TRAINING + 1× MATCH + 1× TOURNAMENT → [TRAINING, MATCH, TOURNAMENT], overflow 3
 */
export function resolvePersonalCalendarDayMarkerSlots(
  sourceTypes: readonly PersonalProgrammeSourceType[],
  totalActivityCount?: number,
): PersonalCalendarDayMarkerSlots {
  const total = totalActivityCount ?? sourceTypes.length;
  if (total <= 0 || sourceTypes.length === 0) {
    return { markerSlots: [], overflowCount: 0 };
  }

  const remaining = new Map<PersonalProgrammeSourceType, number>();
  for (const type of sourceTypes) {
    remaining.set(type, (remaining.get(type) ?? 0) + 1);
  }

  const markerSlots: PersonalProgrammeSourceType[] = [];
  while (markerSlots.length < PERSONAL_CALENDAR_MAX_VISIBLE_MARKERS) {
    let placed = false;
    for (const type of PERSONAL_CALENDAR_MARKER_ORDER) {
      const left = remaining.get(type) ?? 0;
      if (left <= 0) continue;
      markerSlots.push(type);
      remaining.set(type, left - 1);
      placed = true;
      if (markerSlots.length >= PERSONAL_CALENDAR_MAX_VISIBLE_MARKERS) break;
    }
    if (!placed) break;
  }

  const overflowCount = Math.max(0, total - markerSlots.length);
  return { markerSlots, overflowCount };
}
