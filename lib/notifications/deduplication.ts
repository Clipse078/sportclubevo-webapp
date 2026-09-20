import type { NotificationType } from "@prisma/client";

export function buildTaskAssignedDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  assignedAtMs: number;
}): string {
  return `TASK_ASSIGNED:${input.taskId}:${input.recipientUserId}:${input.assignedAtMs}`;
}

export function buildSubtaskAssignedDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  assignedAtMs: number;
}): string {
  return `SUBTASK_ASSIGNED:${input.taskId}:${input.recipientUserId}:${input.assignedAtMs}`;
}

export function buildTaskDueSoonDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  dueAtIso: string;
}): string {
  return `TASK_DUE_SOON:${input.taskId}:${input.recipientUserId}:${input.dueAtIso}`;
}

export function buildTaskOverdueDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  dueAtIso: string;
}): string {
  return `TASK_OVERDUE:${input.taskId}:${input.recipientUserId}:${input.dueAtIso}`;
}

export function buildTaskDeadlineChangedDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  dueAtIso: string | "REMOVED";
  changedAtMs: number;
}): string {
  return `TASK_DEADLINE_CHANGED:${input.taskId}:${input.recipientUserId}:${input.dueAtIso}:${input.changedAtMs}`;
}

export function taskWorkspaceHref(taskId: string): string {
  return `/dashboard/aufgaben/${taskId}`;
}

export function notificationTypeCategory(type: NotificationType): "TASK" {
  void type;
  return "TASK";
}
