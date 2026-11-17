export type MeetingLinkedRefs = {
  agendaItemId?: string;
  decisionId?: string;
};

export function buildMeetingActionAgendaLinkedRefs(agendaItemId: string): MeetingLinkedRefs {
  return buildMeetingActionLinkedRefs({ agendaItemId });
}

export function buildMeetingActionLinkedRefs(input: {
  agendaItemId?: string | null;
  decisionId?: string | null;
}): MeetingLinkedRefs {
  const refs: MeetingLinkedRefs = {};
  const agendaItemId = input.agendaItemId?.trim();
  const decisionId = input.decisionId?.trim();
  if (agendaItemId) refs.agendaItemId = agendaItemId;
  if (decisionId) refs.decisionId = decisionId;
  return refs;
}

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
