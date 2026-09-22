import type { RequirementResolutionStatus, RequirementStatus } from "@prisma/client";
import type { RequirementAggregateDto } from "./types";

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  CLOSED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

export function formatRequirementProgressLabel(
  aggregate: RequirementAggregateDto | null,
  draftAudienceCount: number,
  status: RequirementStatus,
): string {
  if (status === "DRAFT") {
    return draftAudienceCount === 1
      ? "1 Person ausgewählt"
      : `${draftAudienceCount} Personen ausgewählt`;
  }
  if (!aggregate || aggregate.totalRecipients === 0) {
    return "—";
  }
  return `${aggregate.resolvedCount} / ${aggregate.totalRecipients} bestätigt`;
}

export function formatRequirementOpenLabel(aggregate: RequirementAggregateDto | null): string | null {
  if (!aggregate || aggregate.openCount === 0) return null;
  return `${aggregate.openCount} offen`;
}

export function formatRecipientResolutionLabel(status: RequirementResolutionStatus): string {
  return status === "RESOLVED" ? "Bestätigt" : "Offen";
}

export function formatRecipientResponseLabel(responseValue: string | null): string {
  if (responseValue === "ACKNOWLEDGED") return "Bestätigt";
  return "—";
}

export function formatActingForLabel(input: {
  subjectPersonId: string;
  responseActorPersonId: string | null;
  subjectDisplayName: string;
  actorDisplayName: string | null;
}): string | null {
  if (!input.responseActorPersonId) return null;
  if (input.responseActorPersonId === input.subjectPersonId) return null;
  if (!input.actorDisplayName) return null;
  return `durch ${input.actorDisplayName}`;
}
