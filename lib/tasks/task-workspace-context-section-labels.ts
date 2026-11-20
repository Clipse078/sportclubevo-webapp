import type { TaskContextType } from "@prisma/client";

/**
 * Section headings for operational task context on the dedicated task workspace.
 * Distinct from {@link TASK_CONTEXT_LABELS} (compact type names in lists).
 */
export const TASK_WORKSPACE_CONTEXT_SECTION_LABELS: Record<TaskContextType, string> = {
  MATCH: "Zugehöriges Spiel",
  TRAINING: "Zugehöriges Training",
  TOURNAMENT: "Zugehöriger Wettkampf",
  CLUB_EVENT: "Zugehörige Veranstaltung",
  MEETING: "Zugehörige Sitzung",
  MEETING_DECISION: "Zugehöriger Beschluss",
  INITIATIVE: "Zugehöriges Vorhaben",
  TARGET: "Zugehöriges Ziel",
  REGISTRATION: "Zugehörige Anmeldung",
  TEAM: "Zugehöriges Team",
  PERSON: "Zugehörige Person",
  DOCUMENT: "Zugehöriges Dokument",
  CLUB_MELDUNG: "Zugehörige Meldung",
};

export function taskWorkspaceContextSectionLabel(
  contextType: TaskContextType | null | undefined,
): string {
  if (!contextType) return "Kontext";
  return TASK_WORKSPACE_CONTEXT_SECTION_LABELS[contextType] ?? "Kontext";
}