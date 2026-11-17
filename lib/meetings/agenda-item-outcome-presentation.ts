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

export function countAgendaLinkedTasks(agendaItemId: string, taskCountByAgendaId: ReadonlyMap<string, number>): number {
  return taskCountByAgendaId.get(agendaItemId) ?? 0;
}

export function buildAgendaItemOutcomeLinkLabels(
  agendaItemId: string,
  decisions: ReadonlyArray<{ sourceAgendaItemId: string | null }>,
  actions: ReadonlyArray<{ linkedRefs?: unknown }>,
  taskCountByAgendaId: ReadonlyMap<string, number> = new Map(),
): string[] {
  const labels: string[] = [];
  const decisionCount = countAgendaLinkedDecisions(agendaItemId, decisions);
  const actionCount = countAgendaLinkedActions(agendaItemId, actions);
  const taskCount = countAgendaLinkedTasks(agendaItemId, taskCountByAgendaId);
  if (decisionCount > 0) {
    labels.push(decisionCount === 1 ? "1 Beschluss" : `${decisionCount} Beschlüsse`);
  }
  if (actionCount > 0) {
    labels.push(actionCount === 1 ? "1 Pendenz" : `${actionCount} Pendenzen`);
  }
  if (taskCount > 0) {
    labels.push(taskCount === 1 ? "1 Aufgabe" : `${taskCount} Aufgaben`);
  }
  return labels;
}