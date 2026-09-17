import type { WeekplannerItem } from "./types";

/** Stable canonical identity for conflict exclusion (never compare an activity to itself). */
export function weekplannerCanonicalActivityKey(item: WeekplannerItem): string {
  switch (item.type) {
    case "TRAINING":
      return `TRAINING:${item.trainingSessionId}`;
    case "MATCH":
      return `MATCH:${item.eventId}`;
    case "TOURNAMENT":
      return `TOURNAMENT:${item.eventId}`;
    case "VERANSTALTUNG":
      return `VERANSTALTUNG:${item.eventId}`;
  }
}
