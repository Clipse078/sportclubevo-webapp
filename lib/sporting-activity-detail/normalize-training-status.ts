import type { TrainingSessionStatus } from "@/lib/training/types";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";

export function normalizeTrainingProgrammeStatus(
  status: TrainingSessionStatus,
): PersonalProgrammePresentationStatus | undefined {
  switch (status) {
    case "SCHEDULED":
      return "scheduled";
    case "CANCELLED":
      return "cancelled";
    case "POSTPONED":
    case "MOVED":
      return "postponed";
    default:
      return undefined;
  }
}
