import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type PlannerSportingActivityTypePresentation = {
  kind: SportingActivityKind;
  label: string;
};

export function resolvePlannerSportingActivityTypePresentation(
  type: WeekplannerItem["type"],
): PlannerSportingActivityTypePresentation | null {
  switch (type) {
    case "TRAINING":
      return { kind: "TRAINING", label: "TRAINING" };
    case "MATCH":
      return { kind: "MATCH", label: "SPIEL" };
    case "TOURNAMENT":
      return { kind: "TOURNAMENT", label: "TURNIER" };
    default:
      return null;
  }
}

export function resolveWochenplanBoardEventTypePresentation(
  eventType: string,
): PlannerSportingActivityTypePresentation | null {
  switch (eventType) {
    case "TRAINING":
      return { kind: "TRAINING", label: "TRAINING" };
    case "MATCH":
      return { kind: "MATCH", label: "SPIEL" };
    case "TOURNAMENT":
      return { kind: "TOURNAMENT", label: "TURNIER" };
    default:
      return null;
  }
}
