import type { AgendaLinkedTaskSummary } from "@/lib/meetings/agenda-item-ergebnisse";

export type SerializedAgendaLinkedTaskSummary = {
  id: string;
  title: string;
  status: AgendaLinkedTaskSummary["status"];
  dueAt: string | null;
  assigneeLabel: string | null;
  agendaItemId: string;
  decisionId: string | null;
  createdAt: string;
};

export function serializeAgendaLinkedTaskSummaries(
  rows: AgendaLinkedTaskSummary[],
): SerializedAgendaLinkedTaskSummary[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    assigneeLabel: row.assigneeLabel,
    agendaItemId: row.agendaItemId,
    decisionId: row.decisionId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export function hydrateAgendaLinkedTaskSummaries(
  rows: SerializedAgendaLinkedTaskSummary[],
): AgendaLinkedTaskSummary[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    dueAt: row.dueAt ? new Date(row.dueAt) : null,
    assigneeLabel: row.assigneeLabel,
    agendaItemId: row.agendaItemId,
    decisionId: row.decisionId,
    createdAt: new Date(row.createdAt),
  }));
}