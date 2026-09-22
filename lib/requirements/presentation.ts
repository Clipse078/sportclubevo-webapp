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
  return `${aggregate.resolvedCount} / ${aggregate.totalRecipients} erledigt`;
}

export function formatRequirementOpenLabel(aggregate: RequirementAggregateDto | null): string | null {
  if (!aggregate || aggregate.openCount === 0) return null;
  return `${aggregate.openCount} offen`;
}

export function formatRequirementOverviewProgressLabel(
  aggregate: RequirementAggregateDto | null,
): string | null {
  if (!aggregate || aggregate.totalRecipients === 0) return null;
  return `${aggregate.resolvedCount} / ${aggregate.totalRecipients} erledigt · ${aggregate.resolvedPercent} %`;
}

export function formatRequirementReminderSummary(input: {
  remindersConfigured: boolean;
  reminder1At: string | null;
  reminder2At: string | null;
  locale: string;
  timeZone: string;
}): string | null {
  if (!input.remindersConfigured) return null;
  const formatter = new Intl.DateTimeFormat(input.locale, {
    timeZone: input.timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts: string[] = [];
  if (input.reminder1At) parts.push(formatter.format(new Date(input.reminder1At)));
  if (input.reminder2At) parts.push(formatter.format(new Date(input.reminder2At)));
  if (parts.length === 0) return "Erinnerungen konfiguriert";
  return parts.length === 1 ? `Erinnerung ${parts[0]}` : `Erinnerungen ${parts.join(", ")}`;
}

export function formatRecipientResolutionLabel(status: RequirementResolutionStatus): string {
  return status === "RESOLVED" ? "Erledigt" : "Offen";
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
