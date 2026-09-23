import type { PersonalProgrammeItem } from "./personal-programme-types";

/**
 * Canonical programme ordering:
 * 1. startsAt ascending
 * 2. sourceType (stable enum order)
 * 3. id (stable resource identity)
 */
const SOURCE_TYPE_ORDER: Record<string, number> = {
  TRAINING: 0,
  MATCH: 1,
  TOURNAMENT: 2,
  EVENT: 3,
  MEETING: 4,
};

export function sortPersonalProgrammeItems(items: PersonalProgrammeItem[]): PersonalProgrammeItem[] {
  return [...items].sort((a, b) => {
    const byStart = a.startsAt.getTime() - b.startsAt.getTime();
    if (byStart !== 0) return byStart;
    const bySource =
      (SOURCE_TYPE_ORDER[a.sourceType] ?? 99) - (SOURCE_TYPE_ORDER[b.sourceType] ?? 99);
    if (bySource !== 0) return bySource;
    return a.id.localeCompare(b.id);
  });
}
