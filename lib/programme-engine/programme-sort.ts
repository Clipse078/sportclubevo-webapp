import type { ProgrammeItem } from "./types";

/** Deterministic chronological ordering: date → start time → stable id tie-breaker. */
export function sortProgrammeItems(items: ProgrammeItem[]): ProgrammeItem[] {
  return [...items].sort((a, b) => {
    const startDiff = a.startsAt.getTime() - b.startsAt.getTime();
    if (startDiff !== 0) return startDiff;
    const endA = a.endsAt?.getTime() ?? 0;
    const endB = b.endsAt?.getTime() ?? 0;
    if (endA !== endB) return endA - endB;
    return a.id.localeCompare(b.id);
  });
}
