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

/** Per-recipient confirmation aggregate for management surfaces (R4.2). */
export function formatRequirementConfirmationAggregateLabel(
  aggregate: RequirementAggregateDto | null,
  status: RequirementStatus,
): string | null {
  if (status === "DRAFT") return null;
  if (!aggregate || aggregate.totalRecipients === 0) return null;
  const confirmed = aggregate.acknowledgedCount;
  const total = aggregate.totalRecipients;
  const parts = [`${confirmed} / ${total} bestätigt`];
  if (aggregate.openCount > 0) {
    parts.push(`${aggregate.openCount} offen`);
  }
  if (aggregate.overdueCount > 0) {
    parts.push(`${aggregate.overdueCount} überfällig`);
  }
  return parts.length === 1 ? parts[0]! : `${parts[0]} · ${parts.slice(1).join(" · ")}`;
}

export function formatRequirementRecipientCountLabel(
  aggregate: RequirementAggregateDto | null,
  draftAudienceCount: number,
  status: RequirementStatus,
): string {
  if (status === "DRAFT") {
    return draftAudienceCount === 1 ? "1 Empfänger" : `${draftAudienceCount} Empfänger`;
  }
  if (!aggregate || aggregate.totalRecipients === 0) return "—";
  return aggregate.totalRecipients === 1
    ? "1 Empfänger"
    : `${aggregate.totalRecipients} Empfänger`;
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
