import { TaskStatus } from "@prisma/client";

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
    return "Bereits im Sprint";
  }
  if (input.otherSprintTitle) {
    return `Bereits im Sprint „${input.otherSprintTitle}" — Aufgaben werden nicht automatisch verschoben.`;
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