import type { TraktandumOutcomeForm } from "@/lib/meetings/sitzungsmodus/meeting-traktandum-outcome-draft";

export const MEETING_CAPTURE_SURFACE_HEADING = "Was halten wir fest?" as const;

export type MeetingCaptureKind = Exclude<TraktandumOutcomeForm, null>;

export const MEETING_CAPTURE_KIND_LABEL: Record<MeetingCaptureKind, string> = {
  decision: "Beschluss",
  aufgabe: "Aufgabe",
  pendenz: "Pendenz",
  note: "Notiz",
};

export const MEETING_CAPTURE_KIND_HINT: Record<MeetingCaptureKind, string> = {
  decision:
    "Festhalten, was die Sitzung entschieden hat. Der Titel ist der verbindliche Beschluss — Wortlaut und Begründung optional.",
  aufgabe:
    "Umsetzung mit Verantwortlichen und Frist im Aufgaben-Center. Eine Identität — sichtbar in Pendenzen und Meine Aufgaben.",
  pendenz:
    "Sitzungsmassnahme im Protokoll (Pendenz). Für Verantwortliche und Frist ohne separates Aufgaben-Center-Datensatz.",
  note: "Ergänzung zum Traktandum im Protokoll — ohne neuen Beschluss oder Massnahme.",
};

export const MEETING_DECISION_DECISION_FIELD_LABEL = "Was wurde entschieden?" as const;