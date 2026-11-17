import { parseMeetingLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";

export function countAgendaLinkedDecisions(
  agendaItemId: string,
  decisions: ReadonlyArray<{ sourceAgendaItemId: string | null }>,
): number {
  return decisions.filter((d) => d.sourceAgendaItemId === agendaItemId).length;
}

export function countAgendaLinkedActions(
  agendaItemId: string,
  actions: ReadonlyArray<{ linkedRefs?: unknown }>,
): number {
  return actions.filter((action) => parseMeetingLinkedRefs(action.linkedRefs).agendaItemId === agendaItemId).length;
}

export function buildAgendaItemOutcomeLinkLabels(
  agendaItemId: string,
  decisions: ReadonlyArray<{ sourceAgendaItemId: string | null }>,
  actions: ReadonlyArray<{ linkedRefs?: unknown }>,
): string[] {
  const labels: string[] = [];
  const decisionCount = countAgendaLinkedDecisions(agendaItemId, decisions);
  const actionCount = countAgendaLinkedActions(agendaItemId, actions);
  if (decisionCount > 0) {
    labels.push(decisionCount === 1 ? "1 Beschluss" : `${decisionCount} Beschlüsse`);
  }
  if (actionCount > 0) {
    labels.push(actionCount === 1 ? "1 Pendenz" : `${actionCount} Pendenzen`);
  }
  return labels;
}