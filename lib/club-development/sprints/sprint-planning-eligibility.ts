import { TaskStatus } from "@prisma/client";
import { CD_SPRINT_API_COPY } from "@/lib/club-development/product-copy";

/** Terminal Aufgabenstatus — not offered for sprint planning by default. */
export function isSprintPlanningEligibleStatus(status: TaskStatus): boolean {
  return status !== TaskStatus.DONE && status !== TaskStatus.CANCELLED;
}

export function sprintPlanningExclusionMessage(input: {
  inTargetSprint: boolean;
  otherSprintTitle: string | null;
  status: TaskStatus;
}): string | null {
  if (input.inTargetSprint) {
    return CD_SPRINT_API_COPY.alreadyInPhase;
  }
  if (input.otherSprintTitle) {
    return CD_SPRINT_API_COPY.alreadyInPhaseNamed(input.otherSprintTitle);
  }
  if (!isSprintPlanningEligibleStatus(input.status)) {
    return "Abgeschlossene oder abgebrochene Aufgaben können nicht geplant werden.";
  }
  return null;
}

export function isSprintPlanningTaskSelectable(input: {
  inTargetSprint: boolean;
  otherSprintTitle: string | null;
  status: TaskStatus;
}): boolean {
  if (input.inTargetSprint) return false;
  if (input.otherSprintTitle) return false;
  return isSprintPlanningEligibleStatus(input.status);
}