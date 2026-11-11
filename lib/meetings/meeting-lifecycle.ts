/**
 * Meeting lifecycle (operational) — separate from governance reviewStage.
 * Maps existing MeetingStatus + workspace signals to German UX labels.
 */

import type { MeetingStatus } from "@prisma/client";

export type MeetingLifecycleContext = {
  status: MeetingStatus;
  meetingDate: Date;
  participantCount: number;
  agendaCount: number;
  decisionCount: number;
  actionCount: number;
  hasInvitedParticipants?: boolean;
};

export type MeetingLifecyclePresentation = {
  lifecycleLabel: string;
  lifecycleDetail: string;
  isGovernanceRelevant: boolean;
};

export type MeetingPrimaryAction = {
  label: string;
  description: string;
  targetSectionId: string | null;
};

export function getMeetingLifecyclePresentation(
  input: MeetingLifecycleContext,
): MeetingLifecyclePresentation {
  const now = Date.now();
  const meetingMs = new Date(input.meetingDate).getTime();
  const inPast = Number.isFinite(meetingMs) && meetingMs < now;

  if (input.status === "CANCELLED") {
    return {
      lifecycleLabel: "Abgesagt",
      lifecycleDetail: "Diese Sitzung wurde abgesagt.",
      isGovernanceRelevant: false,
    };
  }

  if (input.status === "COMPLETED") {
    return {
      lifecycleLabel: "Abgeschlossen",
      lifecycleDetail: "Protokoll und Nachverfolgung abgeschlossen.",
      isGovernanceRelevant: true,
    };
  }

  if (input.participantCount === 0 && input.agendaCount === 0) {
    return {
      lifecycleLabel: "Entwurf",
      lifecycleDetail: "Sitzung angelegt — Teilnehmer und Traktanden noch offen.",
      isGovernanceRelevant: false,
    };
  }

  if (inPast && input.participantCount > 0) {
    return {
      lifecycleLabel: "Durchgeführt",
      lifecycleDetail: "Sitzung termingerecht — Protokoll und Massnahmen pflegen.",
      isGovernanceRelevant: true,
    };
  }

  if (input.participantCount > 0) {
    return {
      lifecycleLabel: input.hasInvitedParticipants ? "Eingeladen" : "Geplant",
      lifecycleDetail: "Teilnehmer erfasst — Einladungen separat vorbereiten und versenden.",
      isGovernanceRelevant: false,
    };
  }

  return {
    lifecycleLabel: "Geplant",
    lifecycleDetail: "Termin steht — als Nächstes Teilnehmer oder Traktanden erfassen.",
    isGovernanceRelevant: false,
  };
}

export function getMeetingPrimaryAction(input: MeetingLifecycleContext): MeetingPrimaryAction {
  if (input.status === "CANCELLED") {
    return {
      label: "Sitzung archiviert",
      description: "Keine weiteren Schritte.",
      targetSectionId: null,
    };
  }

  if (input.status === "COMPLETED") {
    return {
      label: "Beschlüsse & Massnahmen prüfen",
      description: "Offene Punkte aus der Sitzung nachverfolgen.",
      targetSectionId: "meeting-section-beschlüsse",
    };
  }

  if (input.participantCount === 0) {
    return {
      label: "Teilnehmer hinzufügen",
      description: "Personen aus dem Verein für die Sitzung erfassen (noch keine Einladung versendet).",
      targetSectionId: "meeting-section-teilnehmer",
    };
  }

  if (input.agendaCount === 0) {
    return {
      label: "Traktandum hinzufügen",
      description: "Agenda und geplante Zeit pro Punkt festlegen.",
      targetSectionId: "meeting-section-traktanden",
    };
  }

  if (input.participantCount > 0 && input.decisionCount === 0 && input.actionCount === 0) {
    return {
      label: "Einladungen vorbereiten",
      description:
        "Teilnehmerliste steht — Versand von E-Mail/Kalender folgt in einem späteren Paket; hier nur vorbereiten.",
      targetSectionId: "meeting-section-teilnehmer",
    };
  }

  return {
    label: "Beschlüsse & Massnahmen prüfen",
    description: "Ergebnisse der Sitzung festhalten und Aufgaben ableiten.",
    targetSectionId: "meeting-section-beschlüsse",
  };
}
