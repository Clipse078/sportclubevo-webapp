/**
 * AUFGABEN-06B — TASK_MENTION notifications (dedup: commentId + userId, at most once).
 */

import type { Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType as NotificationTypeEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildTaskMentionDedupKey, taskWorkspaceCommentHref } from "@/lib/notifications/deduplication";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import { NOTIFICATION_LOG_PREFIX } from "@/lib/notifications/constants";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { buildTaskMentionCopy } from "@/lib/notifications/task-copy";
import { taskAuthorizationFromRow, type VisibleTaskRow } from "./task-access";
import { canUserReadTaskNow } from "./task-mention-auth";

export type TaskMentionNotificationInput = {
  tenantId: string;
  taskId: string;
  taskTitle: string;
  commentId: string;
  commentExcerpt: string;
  actorUserId: string;
  actorDisplayName: string;
  mentionedUserIds: string[];
};

export async function emitTaskMentionNotifications(
  task: VisibleTaskRow,
  input: Omit<TaskMentionNotificationInput, "tenantId" | "taskId" | "taskTitle">,
): Promise<void> {
  try {
    await emitTaskMentionNotificationsInner(task, input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} task mention emit failed`, {
      tenantId: task.tenantId,
      taskId: task.id,
      commentId: input.commentId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function emitTaskMentionNotificationsInner(
  task: VisibleTaskRow,
  input: Omit<TaskMentionNotificationInput, "tenantId" | "taskId" | "taskTitle">,
): Promise<void> {
  const authRecord = taskAuthorizationFromRow(task);
  const recipients = [
    ...new Set(
      input.mentionedUserIds.filter(
        (userId) => userId !== input.actorUserId && userId.trim().length > 0,
      ),
    ),
  ];
  if (recipients.length === 0) return;

  const eligible: string[] = [];
  for (const userId of recipients) {
    if (await canUserReadTaskNow(task.tenantId, userId, authRecord)) {
      eligible.push(userId);
    }
  }
  if (eligible.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await emitTaskMentionNotificationsInTx(tx, {
      tenantId: task.tenantId,
      taskId: task.id,
      taskTitle: task.title,
      commentId: input.commentId,
      commentExcerpt: input.commentExcerpt,
      actorUserId: input.actorUserId,
      actorDisplayName: input.actorDisplayName,
      mentionedUserIds: eligible,
    });
  });
}

export async function emitTaskMentionNotificationsInTx(
  tx: Prisma.TransactionClient,
  input: TaskMentionNotificationInput,
): Promise<void> {
  const recipients = [
    ...new Set(input.mentionedUserIds.filter((id) => id !== input.actorUserId)),
  ];
  if (recipients.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    recipients,
    NotificationTypeEnum.TASK_MENTION,
  );

  const copy = buildTaskMentionCopy({
    actorDisplayName: input.actorDisplayName,
    taskTitle: input.taskTitle,
    commentExcerpt: input.commentExcerpt,
  });
  const href = taskWorkspaceCommentHref(input.taskId, input.commentId);

  for (const recipientUserId of recipients) {
    const pref = preferences.get(recipientUserId)!;
    const deduplicationKey = buildTaskMentionDedupKey({
      commentId: input.commentId,
      recipientUserId,
    });

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationTypeEnum.TASK_MENTION,
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
