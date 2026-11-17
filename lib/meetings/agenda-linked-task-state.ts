import type { AgendaLinkedTaskSummary } from "@/lib/meetings/agenda-item-ergebnisse";

export function mergeAgendaLinkedTaskSummaries(
  existing: readonly AgendaLinkedTaskSummary[],
  incoming: readonly AgendaLinkedTaskSummary[],
): AgendaLinkedTaskSummary[] {
  const byId = new Map<string, AgendaLinkedTaskSummary>();
  for (const row of existing) {
    byId.set(row.id, row);
  }
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function countAgendaLinkedTasksByAgendaId(
  tasks: readonly AgendaLinkedTaskSummary[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.agendaItemId, (counts.get(task.agendaItemId) ?? 0) + 1);
  }
  return counts;
}

export function reconcileAgendaLinkedTasksWithServer(
  client: readonly AgendaLinkedTaskSummary[],
  server: readonly AgendaLinkedTaskSummary[],
): AgendaLinkedTaskSummary[] {
  return mergeAgendaLinkedTaskSummaries(server, client);
}