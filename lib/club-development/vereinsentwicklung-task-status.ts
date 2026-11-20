/**
 * Vereinsentwicklung — workflow task status labels, board columns, and transition policy.
 * Server permission checks remain in `updateTask`; this module is presentation + allowed moves.
 */

import { TaskStatus } from "@prisma/client";

/** User-facing labels on Vereinsentwicklung surfaces (PO: Offen, In Arbeit, Wartet, Erledigt). */
export const CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  WAITING: "Wartet",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

export type VereinsentwicklungTaskBoardColumn = "OPEN" | "IN_PROGRESS" | "WAITING" | "DONE";

export const VEREINSENTWICKLUNG_BOARD_COLUMNS: {
  key: VereinsentwicklungTaskBoardColumn;
  label: string;
}[] = [
  { key: "OPEN", label: CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.OPEN },
  { key: "IN_PROGRESS", label: CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.IN_PROGRESS },
  { key: "WAITING", label: CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.WAITING },
  { key: "DONE", label: CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.DONE },
];

export function vereinsentwicklungTaskStatusLabel(status: TaskStatus): string {
  return CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS[status] ?? status;
}

export function mapTaskStatusToVereinsentwicklungBoardColumn(
  status: TaskStatus,
): VereinsentwicklungTaskBoardColumn {
  if (status === TaskStatus.DONE) return "DONE";
  if (status === TaskStatus.IN_PROGRESS) return "IN_PROGRESS";
  if (status === TaskStatus.WAITING) return "WAITING";
  return "OPEN";
}

const WORKFLOW_STATUSES: TaskStatus[] = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING,
  TaskStatus.DONE,
];

/** Transitions exposed in connected-workspace status controls (excludes CANCELLED from menus). */
export function allowedVereinsentwicklungStatusTransitions(current: TaskStatus): TaskStatus[] {
  if (current === TaskStatus.CANCELLED) return [TaskStatus.CANCELLED];
  if (current === TaskStatus.DONE) {
    return [TaskStatus.DONE, TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.WAITING];
  }
  return [...WORKFLOW_STATUSES];
}

export function isVereinsentwicklungWorkflowStatus(status: TaskStatus): boolean {
  return WORKFLOW_STATUSES.includes(status);
}