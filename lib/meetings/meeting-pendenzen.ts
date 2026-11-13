/**
 * SCE-MTG-PEND-01 — Pendenzen unify open MeetingMassnahmen and meeting-scoped Tasks.
 */

import type { MeetingActionStatus, TaskStatus } from "@prisma/client";
import type { ListTasksForContextOptions } from "@/lib/tasks/context-related-task-types";

/** Same permission intersection as related tasks; includes subtasks (separate dedupe keys). */
export const PENDENZ_TASK_LIST_OPTIONS: ListTasksForContextOptions = {
  limit: 50,
  rootsOnly: false,
};

export type PendenzSourceKind = "MASSNAHME" | "AUFGABE";

export type PendenzListItem = {
  dedupeKey: string;
  sourceKind: PendenzSourceKind;
  sourceId: string;
  title: string;
  description: string | null;
  expectedOutcome: string | null;
  ownerLabel: string | null;
  deadline: Date | null;
  status: MeetingActionStatus | TaskStatus;
  statusLabel: string;
  isOverdue: boolean;
  isTerminal: boolean;
  meetingId: string;
  meetingTitle: string;
  meetingSlug: string;
  meetingDate: Date;
  contextReference: string | null;
};

export type PendenzListFilter = "open" | "all";

const TERMINAL_ACTION: MeetingActionStatus[] = ["DONE", "CANCELLED"];
const TERMINAL_TASK: TaskStatus[] = ["DONE", "CANCELLED"];

function isOverdue(deadline: Date | null, terminal: boolean, now: Date): boolean {
  if (terminal || !deadline) return false;
  return deadline.getTime() < now.getTime();
}

export function dedupePendenzKeys(items: PendenzListItem[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const item of items) {
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    keys.push(item.dedupeKey);
  }
  return keys;
}

export function countOpenPendenzen(items: PendenzListItem[]): number {
  return dedupePendenzKeys(items.filter((i) => !i.isTerminal)).length;
}

export function countOverduePendenzen(items: PendenzListItem[]): number {
  return dedupePendenzKeys(items.filter((i) => !i.isTerminal && i.isOverdue)).length;
}

export function filterPendenzen(items: PendenzListItem[], filter: PendenzListFilter): PendenzListItem[] {
  if (filter === "all") return items;
  return items.filter((i) => !i.isTerminal);
}

export function formatOpenPendenzenCountLabel(count: number): string {
  if (count <= 0) return "Keine offenen Pendenzen";
  if (count === 1) return "1 offene Pendenz";
  return `${count} offene Pendenzen`;
}

export function mergeMeetingPendenzen(input: {
  meeting: { id: string; title: string; slug: string; meetingDate: Date };
  actions: Array<{
    id: string;
    title: string;
    description: string | null;
    expectedOutcome: string | null;
    owner: string | null;
    dueDate: Date | null;
    status: MeetingActionStatus;
    statusLabel: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    status: TaskStatus;
    statusLabel: string;
    assigneeLabels: string[];
    contextReference: string | null;
  }>;
  now?: Date;
}): PendenzListItem[] {
  const now = input.now ?? new Date();
  const rows: PendenzListItem[] = [];

  for (const action of input.actions) {
    const terminal = TERMINAL_ACTION.includes(action.status);
    rows.push({
      dedupeKey: `massnahme:${action.id}`,
      sourceKind: "MASSNAHME",
      sourceId: action.id,
      title: action.title,
      description: action.description,
      expectedOutcome: action.expectedOutcome,
      ownerLabel: action.owner,
      deadline: action.dueDate,
      status: action.status,
      statusLabel: action.statusLabel,
      isOverdue: isOverdue(action.dueDate, terminal, now),
      isTerminal: terminal,
      meetingId: input.meeting.id,
      meetingTitle: input.meeting.title,
      meetingSlug: input.meeting.slug,
      meetingDate: input.meeting.meetingDate,
      contextReference: null,
    });
  }

  for (const task of input.tasks) {
    const terminal = TERMINAL_TASK.includes(task.status);
    const owner =
      task.assigneeLabels.length > 0 ? task.assigneeLabels.join(", ") : null;
    rows.push({
      dedupeKey: `aufgabe:${task.id}`,
      sourceKind: "AUFGABE",
      sourceId: task.id,
      title: task.title,
      description: task.description,
      expectedOutcome: null,
      ownerLabel: owner,
      deadline: task.dueAt,
      status: task.status,
      statusLabel: task.statusLabel,
      isOverdue: isOverdue(task.dueAt, terminal, now),
      isTerminal: terminal,
      meetingId: input.meeting.id,
      meetingTitle: input.meeting.title,
      meetingSlug: input.meeting.slug,
      meetingDate: input.meeting.meetingDate,
      contextReference: task.contextReference,
    });
  }

  rows.sort((a, b) => {
    if (a.isTerminal !== b.isTerminal) return a.isTerminal ? 1 : -1;
    const ad = a.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bd = b.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;
    return a.title.localeCompare(b.title, "de");
  });

  return rows;
}
