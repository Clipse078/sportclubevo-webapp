import type { ClubMeldungHistoryEventType, ClubMeldungStatus } from "@prisma/client";
import { CLUB_MELDUNG_STATUS_LABELS } from "@/lib/club-meldungen/copy";

export type ClubMeldungHistoryPresentation = {
  id: string;
  createdAt: string;
  label: string;
  actorName: string;
  detail?: string;
};

export function formatClubMeldungHistoryEvent(input: {
  id: string;
  eventType: ClubMeldungHistoryEventType;
  createdAt: Date;
  actor: { firstName: string; lastName: string };
  payloadJson: unknown;
}): ClubMeldungHistoryPresentation {
  const actorName = `${input.actor.firstName} ${input.actor.lastName}`.trim();
  const payload =
    input.payloadJson && typeof input.payloadJson === "object"
      ? (input.payloadJson as Record<string, unknown>)
      : {};

  switch (input.eventType) {
    case "CREATED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Meldung aufgenommen",
        detail: typeof payload.caseNumber === "string" ? payload.caseNumber : undefined,
      };
    case "STATUS_CHANGED": {
      const to = payload.to as ClubMeldungStatus | undefined;
      const statusLabel = to ? CLUB_MELDUNG_STATUS_LABELS[to] : "Status geändert";
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: `Status: ${statusLabel}`,
      };
    }
    case "ASSIGNED":
    case "REASSIGNED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: input.eventType === "REASSIGNED" ? "Zuständigkeit gewechselt" : "Zuständigkeit vergeben",
      };
    case "WAIT_REASON_SET":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Wartegrund gesetzt",
        detail: typeof payload.waitReason === "string" ? payload.waitReason : undefined,
      };
    case "RESOLUTION_RECORDED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Erledigt dokumentiert",
        detail:
          typeof payload.resolutionSummary === "string" ? payload.resolutionSummary : undefined,
      };
    case "REOPENED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Wiedereröffnet",
        detail: typeof payload.reason === "string" ? payload.reason : undefined,
      };
    case "DUPLICATE_MARKED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Als Duplikat verknüpft",
        detail: typeof payload.caseNumber === "string" ? payload.caseNumber : undefined,
      };
    case "COLLABORATOR_ADDED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Mitwirkende hinzugefügt",
      };
    case "COLLABORATOR_REMOVED":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Mitwirkende entfernt",
      };
    case "REPORTER_MESSAGE":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Nachricht der meldenden Person",
      };
    case "HANDLER_MESSAGE_TO_REPORTER":
      return {
        id: input.id,
        createdAt: input.createdAt.toISOString(),
        actorName,
        label: "Antwort an meldende Person",
      };
    default:
    return {
      id: input.id,
      createdAt: input.createdAt.toISOString(),
      actorName,
      label: "Aktivität",
    };
  }
}