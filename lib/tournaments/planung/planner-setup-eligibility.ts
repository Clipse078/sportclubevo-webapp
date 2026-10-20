/**
 * SCE-DESIGN-SYSTEM-06-R1 / TP01-02 — existing HOME tournament planner activation eligibility.
 */
import type { TournamentPlannerOwnershipResolution } from "@/lib/tournament-scheduling/planner-eligibility";

export type PlannerSetupActivationResolution =
  | { allowed: false; code: "EXTERNALLY_ORGANISED" | "UNKNOWN_OWNERSHIP" | "ALREADY_SCHEDULED" }
  | {
      allowed: true;
      mode: "INITIAL_SETUP" | "RESUME_INCOMPLETE";
    };

export function resolvePlannerSetupActivation(input: {
  ownership: TournamentPlannerOwnershipResolution;
  fixtureCount: number;
  assignmentCount: number;
  hasPlannerSetupIncomplete: boolean;
}): PlannerSetupActivationResolution {
  if (input.ownership === "EXTERNALLY_ORGANISED") {
    return { allowed: false, code: "EXTERNALLY_ORGANISED" };
  }
  if (input.ownership === "UNKNOWN") {
    return { allowed: false, code: "UNKNOWN_OWNERSHIP" };
  }
  if (input.assignmentCount > 0) {
    return { allowed: false, code: "ALREADY_SCHEDULED" };
  }
  if (input.fixtureCount > 0 && !input.hasPlannerSetupIncomplete) {
    return { allowed: false, code: "ALREADY_SCHEDULED" };
  }
  return {
    allowed: true,
    mode: input.hasPlannerSetupIncomplete ? "RESUME_INCOMPLETE" : "INITIAL_SETUP",
  };
}

export function shouldExposePlannerSetupPrimaryAction(input: {
  ownership: TournamentPlannerOwnershipResolution;
  incompleteSetupCodes: readonly string[];
  canManage: boolean;
}): boolean {
  if (!input.canManage) return false;
  if (input.ownership !== "TENANT_ORGANISED") return false;
  return input.incompleteSetupCodes.some(
    (code) => code === "PLANNER_SETUP" || code === "PITCHES" || code === "FIXTURES",
  );
}
