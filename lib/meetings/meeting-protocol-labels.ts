import type {
  MeetingActionStatus,
  MeetingAgendaItemStatus,
  MeetingDecisionStatus,
  MeetingParticipantStatus,
  MeetingStatus,
} from "@prisma/client";

export const MEETING_PARTICIPANT_STATUS_LABEL: Record<MeetingParticipantStatus, string> = {
  PRESENT: "Anwesend",
  ABSENT: "Abwesend",
  EXCUSED: "Entschuldigt",
  INVITED: "Eingeladen",
};

export const MEETING_PARTICIPANT_ATTENDANCE_GROUPS: Array<{
  status: MeetingParticipantStatus;
  heading: string;
}> = [
  { status: "PRESENT", heading: "Anwesend" },
  { status: "EXCUSED", heading: "Entschuldigt" },
  { status: "ABSENT", heading: "Abwesend" },
  { status: "INVITED", heading: "Teilnahme noch nicht bestätigt" },
];

export const MEETING_AGENDA_ITEM_STATUS_PRINT_LABEL: Record<MeetingAgendaItemStatus, string> = {
  OPEN: "Offen",
  DISCUSSED: "Besprochen",
  SKIPPED: "Übersprungen",
};

export const MEETING_DECISION_STATUS_LABEL: Record<MeetingDecisionStatus, string> = {
  DRAFT: "Entwurf",
  CONFIRMED: "Bestätigt",
  SUPERSEDED: "Ersetzt",
};

export const MEETING_ACTION_STATUS_LABEL: Record<MeetingActionStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

export const MEETING_LIFECYCLE_STATUS_LABEL: Record<MeetingStatus, string> = {
  PLANNED: "Geplant",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

export const PROTOCOL_NOT_RECORDED = "Nicht erfasst";
