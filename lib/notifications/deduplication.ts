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

export function buildTaskReminderDedupKey(input: {
  taskId: string;
  recipientUserId: string;
  stage: 1 | 2;
  reminderAtIso: string;
}): string {
  return `task-reminder:${input.taskId}:${input.recipientUserId}:${input.stage}:${input.reminderAtIso}`;
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

/** AUFGABEN-06B — deep link to task workspace comment anchor (stable per comment). */
export function taskWorkspaceCommentHref(taskId: string, commentId: string): string {
  return `${taskWorkspaceHref(taskId)}#comment-${commentId}`;
}

export function buildTaskMentionDedupKey(input: {
  commentId: string;
  recipientUserId: string;
}): string {
  return `TASK_MENTION:${input.commentId}:${input.recipientUserId}`;
}

export function participationPersonalInboxHref(): string {
  return "/dashboard/aufgaben?bereich=meine";
}

export function buildParticipationReminderDedupKey(input: {
  tenantId: string;
  personId: string;
  kind: string;
  entityId: string;
  recipientUserId: string;
  stage: 1 | 2;
  reminderAtIso: string;
}): string {
  return `participation-reminder:${input.tenantId}:${input.personId}:${input.kind}:${input.entityId}:${input.recipientUserId}:${input.stage}:${input.reminderAtIso}`;
}

export function buildParticipationOverdueDedupKey(input: {
  tenantId: string;
  personId: string;
  kind: string;
  entityId: string;
  recipientUserId: string;
  dueAtIso: string;
}): string {
  return `participation-overdue:${input.tenantId}:${input.personId}:${input.kind}:${input.entityId}:${input.recipientUserId}:${input.dueAtIso}`;
}

export function notificationTypeCategory(type: NotificationType): "TASK" | "PARTICIPATION" {
  if (type === "PARTICIPATION_REMINDER" || type === "PARTICIPATION_OVERDUE") {
    return "PARTICIPATION";
  }
  return "TASK";
}
