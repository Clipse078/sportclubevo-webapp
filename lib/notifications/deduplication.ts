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

export {
  taskCreateFromContextHref,
  taskCreateHref,
  taskSeriesCreateHref,
  taskSeriesHref,
  taskWorkspaceCommentHref,
  taskWorkspaceHref,
} from "@/lib/tasks/task-navigation";

export function buildTaskMentionDedupKey(input: {
  commentId: string;
  recipientUserId: string;
}): string {
  return `TASK_MENTION:${input.commentId}:${input.recipientUserId}`;
}

export function buildTaskCommentDedupKey(input: {
  commentId: string;
  recipientUserId: string;
}): string {
  return `TASK_COMMENT:${input.commentId}:${input.recipientUserId}`;
}

export function participationPersonalInboxHref(): string {
  return "/dashboard/aufgaben?bereich=meine";
}

export function requirementPersonalInboxHref(): string {
  return "/dashboard/aufgaben?bereich=meine";
}

/** Deep link to personal Requirement execution for one recipient. */
export function requirementPersonalExecutionHref(recipientId: string): string {
  return `/dashboard/aufgaben/anforderung/${encodeURIComponent(recipientId)}`;
}

export function buildRequirementAssignedDedupKey(input: {
  recipientId: string;
  recipientUserId: string;
}): string {
  return `REQUIREMENT_ASSIGNED:${input.recipientId}:${input.recipientUserId}`;
}

export function buildRequirementReminderDedupKey(input: {
  recipientId: string;
  recipientUserId: string;
  dueAtIso: string;
}): string {
  return `REQUIREMENT_REMINDER:${input.recipientId}:${input.recipientUserId}:${input.dueAtIso}`;
}

export function buildRequirementOverdueDedupKey(input: {
  recipientId: string;
  recipientUserId: string;
  dueAtIso: string;
}): string {
  return `REQUIREMENT_OVERDUE:${input.recipientId}:${input.recipientUserId}:${input.dueAtIso}`;
}

export function buildRequirementChangedDedupKey(input: {
  recipientId: string;
  recipientUserId: string;
  changeToken: string;
}): string {
  return `REQUIREMENT_CHANGED:${input.recipientId}:${input.recipientUserId}:${input.changeToken}`;
}

export function buildRequirementCancelledDedupKey(input: {
  recipientId: string;
  recipientUserId: string;
}): string {
  return `REQUIREMENT_CANCELLED:${input.recipientId}:${input.recipientUserId}`;
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

export function notificationTypeCategory(
  type: NotificationType,
): "TASK" | "PARTICIPATION" | "REQUIREMENT" {
  if (type === "PARTICIPATION_REMINDER" || type === "PARTICIPATION_OVERDUE") {
    return "PARTICIPATION";
  }
  if (
    type === "REQUIREMENT_ASSIGNED" ||
    type === "REQUIREMENT_REMINDER" ||
    type === "REQUIREMENT_OVERDUE" ||
    type === "REQUIREMENT_CHANGED" ||
    type === "REQUIREMENT_CANCELLED"
  ) {
    return "REQUIREMENT";
  }
  return "TASK";
}
