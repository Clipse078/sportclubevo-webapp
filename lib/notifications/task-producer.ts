import type { NotificationType, Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType as NotificationTypeEnum } from "@prisma/client";
import {
  buildSubtaskAssignedDedupKey,
  buildTaskAssignedDedupKey,
  buildTaskDeadlineChangedDedupKey,
  taskWorkspaceHref,
} from "./deduplication";
import { loadEffectivePreferencesForUsers } from "./preference-service";
import { createNotificationIdempotent } from "./notification-service";
import { shouldEmitSeriesAssignmentNotification } from "./recurrence-assignment";
import {
  buildTaskAssignedCopy,
  buildTaskDeadlineChangedCopy,
  formatTaskDueLabel,
} from "./task-copy";

export type TaskAssignmentNotificationContext = {
  actorUserId: string;
  seriesGenerated?: boolean;
};

export async function emitTaskAssignmentNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    taskId: string;
    taskTitle: string;
    isSubtask: boolean;
    assigneeRows: Array<{ userId: string; assignedAt: Date }>;
    context: TaskAssignmentNotificationContext;
    dueAt?: Date | null;
  },
): Promise<void> {
  const type: NotificationType = input.isSubtask
    ? NotificationTypeEnum.SUBTASK_ASSIGNED
    : NotificationTypeEnum.TASK_ASSIGNED;

  const recipients = input.assigneeRows.filter((row) => {
    if (row.userId === input.context.actorUserId) {
      return false;
    }
    if (input.context.seriesGenerated) {
      return shouldEmitSeriesAssignmentNotification(input.dueAt ?? null);
    }
    return true;
  });

  if (recipients.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    recipients.map((r) => r.userId),
    type,
  );

  const copy = buildTaskAssignedCopy(input.taskTitle, input.isSubtask);
  const href = taskWorkspaceHref(input.taskId);

  for (const recipient of recipients) {
    const pref = preferences.get(recipient.userId)!;
    const deduplicationKey = input.isSubtask
      ? buildSubtaskAssignedDedupKey({
          taskId: input.taskId,
          recipientUserId: recipient.userId,
          assignedAtMs: recipient.assignedAt.getTime(),
        })
      : buildTaskAssignedDedupKey({
          taskId: input.taskId,
          recipientUserId: recipient.userId,
          assignedAtMs: recipient.assignedAt.getTime(),
        });

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId: recipient.userId,
      type,
      title: copy.title,
      body: copy.body,
      href,
      entityType: NotificationEntityType.TASK,
      entityId: input.taskId,
      deduplicationKey,
      preferences: pref,
    });
  }
}

export async function emitTaskDeadlineChangedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    taskId: string;
    taskTitle: string;
    assigneeUserIds: string[];
    actorUserId: string;
    previousDueAt: Date | null;
    nextDueAt: Date | null;
    changedAt: Date;
    locale: string;
    timeZone: string;
  },
): Promise<void> {
  const prevMs = input.previousDueAt?.getTime() ?? null;
  const nextMs = input.nextDueAt?.getTime() ?? null;
  if (prevMs === nextMs) return;

  const recipients = input.assigneeUserIds.filter((id) => id !== input.actorUserId);
  if (recipients.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    recipients,
    NotificationTypeEnum.TASK_DEADLINE_CHANGED,
  );

  const dueLabel = formatTaskDueLabel(input.nextDueAt, input.locale, input.timeZone);
  const copy = buildTaskDeadlineChangedCopy(input.taskTitle, dueLabel);
  const href = taskWorkspaceHref(input.taskId);

  for (const recipientUserId of recipients) {
    const pref = preferences.get(recipientUserId)!;
    const deduplicationKey = buildTaskDeadlineChangedDedupKey({
      taskId: input.taskId,
      recipientUserId,
      dueAtIso: input.nextDueAt?.toISOString() ?? "REMOVED",
      changedAtMs: input.changedAt.getTime(),
    });

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationTypeEnum.TASK_DEADLINE_CHANGED,
      title: copy.title,
      body: copy.body,
      href,
      entityType: NotificationEntityType.TASK,
      entityId: input.taskId,
      deduplicationKey,
      preferences: pref,
    });
  }
}

export function computeNewAssigneeRows(
  previousUserIds: string[],
  nextUserIds: string[],
  assignedAt: Date,
): Array<{ userId: string; assignedAt: Date }> {
  const previous = new Set(previousUserIds);
  return nextUserIds
    .filter((userId) => !previous.has(userId))
    .map((userId) => ({ userId, assignedAt }));
}
