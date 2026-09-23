import type { PersonalProgrammePresentationStatus } from "./personal-programme-types";

export function normalizeEventProgrammeStatus(
  status: string,
): PersonalProgrammePresentationStatus | undefined {
  switch (status) {
    case "SCHEDULED":
    case "DRAFT":
      return "scheduled";
    case "CANCELLED":
      return "cancelled";
    case "POSTPONED":
      return "postponed";
    case "COMPLETED":
      return "completed";
    case "LIVE":
      return "live";
    default:
      return undefined;
  }
}

export function normalizeMeetingProgrammeStatus(
  status: string,
): PersonalProgrammePresentationStatus | undefined {
  if (status === "PLANNED") return "scheduled";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return undefined;
}
