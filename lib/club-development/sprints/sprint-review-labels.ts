import type { DevelopmentSprintGoalResult } from "@prisma/client";

const GOAL_RESULT_LABELS: Record<DevelopmentSprintGoalResult, string> = {
  ACHIEVED: "Ziel erreicht",
  PARTLY_ACHIEVED: "Ziel teilweise erreicht",
  NOT_ACHIEVED: "Ziel nicht erreicht",
};

export function sprintGoalResultLabel(result: DevelopmentSprintGoalResult | null): string | null {
  if (!result) return null;
  return GOAL_RESULT_LABELS[result];
}