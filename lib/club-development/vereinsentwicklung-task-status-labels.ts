import type { TaskStatus } from "@prisma/client";

/** Canonical Vereinsentwicklung backlog status copy (PO Zielboard). */
export const VEREINSENTWICKLUNG_TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

export function formatVereinsentwicklungTaskStatusLabel(status: TaskStatus): string {
  return VEREINSENTWICKLUNG_TASK_STATUS_LABELS[status] ?? status;
}