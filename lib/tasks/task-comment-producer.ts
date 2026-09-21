/**
 * AUFGABEN-06C — TASK_COMMENT notifications for explicit TaskFollowers.
 */

import type { Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType as NotificationTypeEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  buildTaskCommentDedupKey,
  taskWorkspaceCommentHref,
} from "@/lib/notifications/deduplication";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import { NOTIFICATION_LOG_PREFIX } from "@/lib/notifications/constants";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { buildTaskCommentCopy } from "@/lib/notifications/task-copy";
import { taskAuthorizationFromRow, type VisibleTaskRow } from "./task-access";
import { filterUserIdsWhoCanReadTask } from "./task-mention-auth";
import { listTaskFollowerUserIds } from "./task-follow-service";

export type TaskCommentNotificationInput = {
  tenantId: string;
  taskId: string;
  taskTitle: string;
  commentId: string;
  commentExcerpt: string;
  actorUserId: string;
  actorDisplayName: string;
  excludeRecipientUserIds: string[];
};

export async function emitTaskCommentNotifications(
  task: VisibleTaskRow,
  input: Omit<TaskCommentNotificationInput, "tenantId" | "taskId" | "taskTitle">,
): Promise<void> {
  try {
    await emitTaskCommentNotificationsInner(task, input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} task comment emit failed`, {
      tenantId: task.tenantId,
      taskId: task.id,
      commentId: input.commentId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function emitTaskCommentNotificationsInner(
  task: VisibleTaskRow,
  input: Omit<TaskCommentNotificationInput, "tenantId" | "taskId" | "taskTitle">,
): Promise<void> {
  const authRecord = taskAuthorizationFromRow(task);
  const exclude = new Set(
    [...input.excludeRecipientUserIds, input.actorUserId]
      .map((id) => id.trim())
      .filter(Boolean),
  );

  const followerUserIds = await listTaskFollowerUserIds(task.tenantId, task.id);
  const candidates = [
    ...new Set(followerUserIds.filter((userId) => !exclude.has(userId))),
  ];
  if (candidates.length === 0) return;

  const eligible = await filterUserIdsWhoCanReadTask(task.tenantId, authRecord, candidates);
  if (eligible.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await emitTaskCommentNotificationsInTx(tx, {
      tenantId: task.tenantId,
      taskId: task.id,
      taskTitle: task.title,
      commentId: input.commentId,
      commentExcerpt: input.commentExcerpt,
      actorUserId: input.actorUserId,
      actorDisplayName: input.actorDisplayName,
      excludeRecipientUserIds: [...exclude],
    }, eligible);
  });
}

export async function emitTaskCommentNotificationsInTx(
  tx: Prisma.TransactionClient,
  input: TaskCommentNotificationInput,
  recipientUserIds: string[],
): Promise<void> {
  const exclude = new Set(input.excludeRecipientUserIds);
  const recipients = [
    ...new Set(
      recipientUserIds.filter(
        (userId) => userId !== input.actorUserId && !exclude.has(userId),
      ),
    ),
  ];
  if (recipients.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    recipients,
    NotificationTypeEnum.TASK_COMMENT,
  );

  const copy = buildTaskCommentCopy({
    actorDisplayName: input.actorDisplayName,
    taskTitle: input.taskTitle,
    commentExcerpt: input.commentExcerpt,
  });
  const href = taskWorkspaceCommentHref(input.taskId, input.commentId);

  for (const recipientUserId of recipients) {
    const pref = preferences.get(recipientUserId)!;
    const deduplicationKey = buildTaskCommentDedupKey({
      commentId: input.commentId,
      recipientUserId,
    });

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationTypeEnum.TASK_COMMENT,
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
