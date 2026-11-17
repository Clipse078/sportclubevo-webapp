import type { MeetingActionStatus, MeetingDecisionStatus, TaskStatus } from "@prisma/client";
import { MEETING_ACTION_STATUS_LABEL, MEETING_DECISION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import { parseMeetingLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";
import {
  buildMeetingDecisionDeepLink,
  buildMeetingPendenzDeepLink,
} from "@/lib/meetings/meeting-traktandum-navigation";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";

export type AgendaErgebnisKind = "BESCHLUSS" | "PENDENZ" | "AUFGABE";

export type AgendaErgebnisRow = {
  id: string;
  kind: AgendaErgebnisKind;
  title: string;
  statusLabel: string;
  meta: string | null;
  href: string;
  linkedDecisionId?: string | null;
};

export type AgendaErgebnisDisplayNode =
  | { type: "row"; row: AgendaErgebnisRow }
  | { type: "group"; decision: AgendaErgebnisRow; children: AgendaErgebnisRow[] };

export type AgendaLinkedTaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: Date | null;
  assigneeLabel: string | null;
  agendaItemId: string;
  decisionId: string | null;
  createdAt: Date;
};

type DecisionLike = {
  id: string;
  title: string;
  status: MeetingDecisionStatus;
  sourceAgendaItemId: string | null;
  orderIndex: number;
};

type ActionLike = {
  id: string;
  title: string;
  status: MeetingActionStatus;
  owner: string | null;
  dueDate: Date | null;
  linkedRefs?: unknown;
  createdAt?: Date | null;
};

function formatDue(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function buildAgendaItemErgebnisseRows(input: {
  agendaItemId: string;
  meetingSlug: string;
  decisions: readonly DecisionLike[];
  actions: readonly ActionLike[];
  tasks: readonly AgendaLinkedTaskSummary[];
}): AgendaErgebnisRow[] {
  const rows: Array<AgendaErgebnisRow & { sortKey: string }> = [];

  for (const decision of input.decisions) {
    if (decision.sourceAgendaItemId !== input.agendaItemId) continue;
    rows.push({
      id: decision.id,
      kind: "BESCHLUSS",
      title: decision.title,
      statusLabel: MEETING_DECISION_STATUS_LABEL[decision.status],
      meta: null,
      href: buildMeetingDecisionDeepLink(input.meetingSlug, decision.id),
      sortKey: `0:${String(decision.orderIndex).padStart(6, "0")}:${decision.id}`,
    });
  }

  for (const action of input.actions) {
    const refs = parseMeetingLinkedRefs(action.linkedRefs);
    if (refs.agendaItemId !== input.agendaItemId) continue;
    const due = formatDue(action.dueDate);
    const meta = [action.owner?.trim() || null, due ? `Fällig ${due}` : null].filter(Boolean).join(" · ") || null;
    rows.push({
      id: action.id,
      kind: "PENDENZ",
      title: action.title,
      statusLabel: MEETING_ACTION_STATUS_LABEL[action.status],
      meta,
      href: buildMeetingPendenzDeepLink(input.meetingSlug, action.id),
      linkedDecisionId: refs.decisionId ?? null,
      sortKey: `1:${action.createdAt ? action.createdAt.toISOString() : action.id}`,
    });
  }

  for (const task of input.tasks) {
    if (task.agendaItemId !== input.agendaItemId) continue;
    const due = formatDue(task.dueAt);
    const meta = [task.assigneeLabel, due ? `Fällig ${due}` : null].filter(Boolean).join(" · ") || null;
    rows.push({
      id: task.id,
      kind: "AUFGABE",
      title: task.title,
      statusLabel: TASK_STATUS_LABELS[task.status],
      meta,
      href: taskWorkspaceHref(task.id),
      linkedDecisionId: task.decisionId,
      sortKey: `2:${task.createdAt.toISOString()}:${task.id}`,
    });
  }

  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return rows.map(({ sortKey: _sortKey, ...row }) => row);
}

export function buildAgendaItemErgebnisseDisplayNodes(rows: readonly AgendaErgebnisRow[]): AgendaErgebnisDisplayNode[] {
  const decisionIds = new Set(rows.filter((r) => r.kind === "BESCHLUSS").map((r) => r.id));
  const childIds = new Set<string>();
  const childrenByDecision = new Map<string, AgendaErgebnisRow[]>();

  for (const row of rows) {
    if (row.kind === "BESCHLUSS") continue;
    const linkId = row.linkedDecisionId?.trim() || null;
    if (!linkId || !decisionIds.has(linkId)) continue;
    childIds.add(row.id);
    const list = childrenByDecision.get(linkId) ?? [];
    list.push(row);
    childrenByDecision.set(linkId, list);
  }

  const nodes: AgendaErgebnisDisplayNode[] = [];
  for (const row of rows) {
    if (childIds.has(row.id)) continue;
    if (row.kind === "BESCHLUSS") {
      const children = childrenByDecision.get(row.id) ?? [];
      if (children.length > 0) {
        nodes.push({ type: "group", decision: row, children });
      } else {
        nodes.push({ type: "row", row });
      }
    } else {
      nodes.push({ type: "row", row });
    }
  }
  return nodes;
}