/**
 * Meeting lifecycle (operational) — separate from governance reviewStage.
 * Maps MeetingStatus + workspace signals to German UX labels (SCE-CD-02R9).
 */

import type { MeetingStatus, ReviewWorkflowStage } from "@prisma/client";

export type MeetingLifecycleContext = {
  status: MeetingStatus;
  meetingDate: Date;
  participantCount: number;
  agendaCount: number;
  decisionCount: number;
  actionCount: number;
  hasInvitedParticipants?: boolean;
  conductedAt?: Date | null;
  reviewStage?: ReviewWorkflowStage;
  protocolApprovalRequired?: boolean;
};

export type MeetingLifecyclePresentation = {
  lifecycleLabel: string;
  lifecycleDetail: string;
  isGovernanceRelevant: boolean;
  showPastDocumentationHint: boolean;
};

export type MeetingPrimaryAction = {
  label: string;
  description: string;
  targetSectionId: string | null;
  /** When set, the header primary button runs this lifecycle PATCH action instead of navigation. */
  lifecycleAction?: "conduct" | "close" | "reopen";
};

function isPastMeeting(meetingDate: Date): boolean {
  const meetingMs = new Date(meetingDate).getTime();
  return Number.isFinite(meetingMs) && meetingMs < Date.now();
}

function protocolLifecycleLabel(
  reviewStage: ReviewWorkflowStage | undefined,
  protocolApprovalRequired: boolean | undefined,
): string | null {
  if (!protocolApprovalRequired) return null;
  switch (reviewStage) {
    case "SUBMITTED":
      return "Zur Freigabe";
    case "REJECTED":
      return "Änderungen angefordert";
    case "APPROVED":
      return "Genehmigt";
    case "DRAFT":
      return "Protokollentwurf";
    default:
      return null;
  }
}

export function getMeetingLifecyclePresentation(
  input: MeetingLifecycleContext,
): MeetingLifecyclePresentation {
  const inPast = isPastMeeting(input.meetingDate);
  const protocolLabel = protocolLifecycleLabel(input.reviewStage, input.protocolApprovalRequired);

  if (input.status === "CANCELLED") {
    return {
      lifecycleLabel: "Abgesagt",
      lifecycleDetail: "Diese Sitzung wurde abgesagt.",
      isGovernanceRelevant: false,
      showPastDocumentationHint: false,
    };
  }

  if (input.status === "COMPLETED") {
    return {
      lifecycleLabel: "Abgeschlossen",
      lifecycleDetail: "Protokoll und Nachverfolgung abgeschlossen — historischer Datensatz.",
      isGovernanceRelevant: true,
      showPastDocumentationHint: false,
    };
  }

  if (protocolLabel) {
    return {
      lifecycleLabel: protocolLabel,
      lifecycleDetail:
        protocolLabel === "Zur Freigabe"
          ? "Protokoll wartet auf Freigabe durch die ausgewählten Personen."
          : protocolLabel === "Änderungen angefordert"
            ? "Protokoll überarbeiten und erneut zur Freigabe einreichen."
            : protocolLabel === "Genehmigt"
              ? "Protokoll genehmigt — Sitzung kann formell abgeschlossen werden."
              : "Protokoll dokumentieren und bei Bedarf zur Freigabe einreichen.",
      isGovernanceRelevant: true,
      showPastDocumentationHint: inPast,
    };
  }

  if (input.conductedAt || (inPast && input.participantCount > 0)) {
    return {
      lifecycleLabel: "Durchgeführt",
      lifecycleDetail: "Sitzung durchgeführt — Protokoll, Beschlüsse und Massnahmen pflegen.",
      isGovernanceRelevant: true,
      showPastDocumentationHint: inPast && !input.conductedAt,
    };
  }

  if (input.participantCount === 0 && input.agendaCount === 0) {
    return {
      lifecycleLabel: "Geplant",
      lifecycleDetail: inPast
        ? "Sitzung liegt in der Vergangenheit — Teilnehmer und Protokoll noch offen."
        : "Sitzung angelegt — Teilnehmer und Traktanden noch offen.",
      isGovernanceRelevant: false,
      showPastDocumentationHint: inPast,
    };
  }

  if (input.participantCount > 0) {
    return {
      lifecycleLabel: input.hasInvitedParticipants ? "Geplant" : "Geplant",
      lifecycleDetail: inPast
        ? "Sitzung liegt in der Vergangenheit — Protokoll vervollständigen."
        : "Teilnehmer erfasst — als Nächstes Traktanden oder Protokoll.",
      isGovernanceRelevant: false,
      showPastDocumentationHint: inPast,
    };
  }

  return {
    lifecycleLabel: "Geplant",
    lifecycleDetail: "Termin steht — als Nächstes Teilnehmer oder Traktanden erfassen.",
    isGovernanceRelevant: false,
    showPastDocumentationHint: inPast,
  };
}

export function getMeetingPrimaryAction(input: MeetingLifecycleContext): MeetingPrimaryAction {
  if (input.status === "PLANNED" && !input.conductedAt && input.participantCount > 0 && input.agendaCount > 0) {
    return {
      label: "Als durchgeführt markieren",
      description: "Sitzung als durchgeführt kennzeichnen und Protokollbearbeitung fortsetzen.",
      targetSectionId: null,
      lifecycleAction: "conduct",
    };
  }

  if (input.status === "CANCELLED") {
    return {
      label: "Sitzung archiviert",
      description: "Keine weiteren Schritte.",
      targetSectionId: null,
    };
  }

  if (input.status === "COMPLETED") {
    return {
      label: "Historischen Protokoll ansehen",
      description: "Beschlüsse, Massnahmen und Freigaben im Archiv.",
      targetSectionId: "meeting-section-beschlüsse",
    };
  }

  if (isPastMeeting(input.meetingDate) && input.participantCount > 0) {
    return {
      label: "Protokoll vervollständigen",
      description: "Sitzung liegt in der Vergangenheit — Dokumentation abschliessen.",
      targetSectionId: "meeting-section-traktanden",
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

  return {
    label: "Beschlüsse & Massnahmen prüfen",
    description: "Ergebnisse der Sitzung festhalten und Aufgaben ableiten.",
    targetSectionId: "meeting-section-beschlüsse",
  };
}
