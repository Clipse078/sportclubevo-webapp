export type MeetingLinkedRefs = {
  agendaItemId?: string;
  decisionId?: string;
};

export function parseMeetingLinkedRefs(raw: unknown): MeetingLinkedRefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const agendaItemId =
    typeof record.agendaItemId === "string" && record.agendaItemId.trim()
      ? record.agendaItemId.trim()
      : typeof record.sourceAgendaItemId === "string" && record.sourceAgendaItemId.trim()
        ? record.sourceAgendaItemId.trim()
        : undefined;
  const decisionId =
    typeof record.decisionId === "string" && record.decisionId.trim()
      ? record.decisionId.trim()
      : undefined;
  return { agendaItemId, decisionId };
}
