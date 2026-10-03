import type { PersonalProgrammeSourceType } from "./personal-programme-types";
import { PERSONAL_CALENDAR_MARKER_ORDER } from "./personal-calendar-day-marker-slots";

export type PersonalCalendarDayAriaSummaryLabels = {
  training: (count: number) => string;
  match: (count: number) => string;
  tournament: (count: number) => string;
  event: (count: number) => string;
  meeting: (count: number) => string;
  oneNamed: (title: string) => string;
  totalCount: (count: number) => string;
};

function countBySourceType(
  sourceTypes: readonly PersonalProgrammeSourceType[],
): Map<PersonalProgrammeSourceType, number> {
  const map = new Map<PersonalProgrammeSourceType, number>();
  for (const type of sourceTypes) {
    map.set(type, (map.get(type) ?? 0) + 1);
  }
  return map;
}

/**
 * Accessible textual summary for a calendar day — never color-only.
 * Example: "2 Trainings, 1 Spiel"
 */
export function buildPersonalCalendarDayActivityAriaPart(
  sourceTypes: readonly PersonalProgrammeSourceType[],
  labels: PersonalCalendarDayAriaSummaryLabels,
  options?: { singleTitle?: string },
): string {
  const total = sourceTypes.length;
  if (total === 0) return "";
  if (total === 1 && options?.singleTitle) {
    return labels.oneNamed(options.singleTitle);
  }

  const counts = countBySourceType(sourceTypes);
  const parts: string[] = [];
  for (const type of PERSONAL_CALENDAR_MARKER_ORDER) {
    const count = counts.get(type) ?? 0;
    if (count <= 0) continue;
    switch (type) {
      case "TRAINING":
        parts.push(labels.training(count));
        break;
      case "MATCH":
        parts.push(labels.match(count));
        break;
      case "TOURNAMENT":
        parts.push(labels.tournament(count));
        break;
      case "EVENT":
        parts.push(labels.event(count));
        break;
      case "MEETING":
        parts.push(labels.meeting(count));
        break;
      default:
        break;
    }
  }

  if (parts.length === 0) {
    return labels.totalCount(total);
  }
  return parts.join(", ");
}
