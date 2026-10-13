import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";
import type { ScePresentationStatusSemantic } from "./types";

const CLUB_EVENT_LIFECYCLE_LABELS: Record<string, string> = {
  SCHEDULED: "Geplant",
  DRAFT: "Entwurf",
  LIVE: "Live",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
  POSTPONED: "Verschoben",
  ARCHIVED: "Archiviert",
};

export function resolveClubEventLifecycleStatusLabel(status: string): string {
  return CLUB_EVENT_LIFECYCLE_LABELS[status] ?? status;
}

export function mapClubEventLifecycleStatusToProgrammeDomain(
  status: string,
): PersonalProgrammePresentationStatus | undefined {
  switch (status) {
    case "LIVE":
      return "live";
    case "SCHEDULED":
      return "scheduled";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "POSTPONED":
      return "postponed";
    default:
      return undefined;
  }
}

export function mapClubEventLifecycleStatusToSemantic(status: string): ScePresentationStatusSemantic {
  switch (status) {
    case "LIVE":
      return "active";
    case "SCHEDULED":
    case "DRAFT":
      return "planned";
    case "COMPLETED":
    case "ARCHIVED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "POSTPONED":
      return "warning";
    default:
      return "neutral";
  }
}

const REVIEW_STAGE_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Zur Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  PUBLISHED: "Veröffentlicht",
};

/** Publication / visibility presentation — distinct from lifecycle `status`. */
export function resolveClubEventPublicationPresentationLabel(input: {
  reviewStage: string;
  websiteVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
}): string {
  if (input.reviewStage === "PUBLISHED") return "Veröffentlicht";
  if (!input.websiteVisible && !input.homepageVisible && !input.wochenplanVisible) {
    return "Intern";
  }
  return REVIEW_STAGE_LABEL[input.reviewStage] ?? input.reviewStage;
}
