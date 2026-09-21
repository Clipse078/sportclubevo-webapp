/**
 * AUFGABEN-06A/06B — Task-native comment service (visibility follows canonical Task auth).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MAX_TASK_COMMENT_BODY_LENGTH } from "./constants";
import { TaskForbiddenError, TaskNotFoundError, TaskValidationError } from "./errors";
import {
  requireVisibleTask,
  taskAuthorizationFromRow,
  type VisibleTaskRow,
} from "./task-access";
import type { TaskServiceContext } from "./types";
import { canManageTask } from "./visibility";
import {
  enrichTaskComments,
  type TaskCommentDto,
  type TaskCommentMentionDto,
} from "./task-comment-enrichment";
import { validateMentionedUsersForTask } from "./task-mention-auth";
import { emitTaskMentionNotifications } from "./task-mention-producer";
import { resolveAuditActorDisplayName } from "@/lib/registrations/actor-display";

const mentionSelect = {
  id: true,
  userId: true,
  createdAt: true,
} as const;

const commentSelect = {
  id: true,
  tenantId: true,
  taskId: true,
  authorUserId: true,
  body: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  mentions: {
    select: mentionSelect,
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export type TaskCommentRecord = Prisma.TaskCommentGetPayload<{ select: typeof commentSelect }>;

function normalizeBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) {
    throw new TaskValidationError("Kommentartext ist erforderlich.");
  }
  if (normalized.length > MAX_TASK_COMMENT_BODY_LENGTH) {
    throw new TaskValidationError(
      `Kommentartext darf maximal ${MAX_TASK_COMMENT_BODY_LENGTH} Zeichen enthalten.`,
    );
  }
  return normalized;
}

function authFromTaskRow(row: VisibleTaskRow) {
  return taskAuthorizationFromRow(row);
}

function mentionExcerpt(body: string): string {
  const line = body.split("\n")[0]?.trim() ?? body.trim();
  return line;
}

async function resolveActorDisplayName(tenantId: string, userId: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      person: {
        where: { tenantId },
        select: { firstName: true, lastName: true, displayName: true },
      },
    },
  });
  if (!user) return "Unbekannt";
  return resolveAuditActorDisplayName(user) ?? user.email ?? "Unbekannt";
}

async function requireCommentForTask(
  ctx: TaskServiceContext,
  taskId: string,
  commentId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<TaskCommentRecord> {
  const comment = await prisma.taskComment.findFirst({
    where: {
      id: commentId,
      tenantId: ctx.tenantId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
    select: commentSelect,
  });

  if (!comment || comment.taskId !== taskId) {
    throw new TaskNotFoundError(commentId);
  }

  return comment;
}

export async function listTaskComments(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskCommentDto[]> {
  await requireVisibleTask(ctx, taskId);

  const rows = await prisma.taskComment.findMany({
    where: { tenantId: ctx.tenantId, taskId },
    select: commentSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return enrichTaskComments(ctx.tenantId, rows);
}

export async function createTaskComment(
  ctx: TaskServiceContext,
  taskId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<TaskCommentDto> {
  const task = await requireVisibleTask(ctx, taskId);
  const normalizedBody = normalizeBody(body);
  const validatedMentions = await validateMentionedUsersForTask(ctx, task, mentionedUserIds);

  const comment = await prisma.$transaction(async (tx) => {
    return tx.taskComment.create({
      data: {
        tenantId: ctx.tenantId,
        taskId,
        authorUserId: ctx.userId,
        body: normalizedBody,
        mentions:
          validatedMentions.length > 0
            ? {
                create: validatedMentions.map((userId) => ({
                  tenantId: ctx.tenantId,
                  userId,
                })),
              }
            : undefined,
      },
      select: commentSelect,
    });
  });

  if (validatedMentions.length > 0) {
    const actorDisplayName = await resolveActorDisplayName(ctx.tenantId, ctx.userId);
    await emitTaskMentionNotifications(task, {
      commentId: comment.id,
      commentExcerpt: mentionExcerpt(normalizedBody),
      actorUserId: ctx.userId,
      actorDisplayName,
      mentionedUserIds: validatedMentions,
    });
  }

  const [dto] = await enrichTaskComments(ctx.tenantId, [comment]);
  return dto!;
}

export async function updateTaskComment(
  ctx: TaskServiceContext,
  taskId: string,
  commentId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<TaskCommentDto> {
  const task = await requireVisibleTask(ctx, taskId);
  const normalizedBody = normalizeBody(body);
  const existing = await requireCommentForTask(ctx, taskId, commentId);

  if (existing.authorUserId !== ctx.userId) {
    throw new TaskForbiddenError("Nur der Autor kann diesen Kommentar bearbeiten.");
  }

  const validatedMentions = await validateMentionedUsersForTask(ctx, task, mentionedUserIds);
  const oldMentionIds = new Set(existing.mentions.map((m) => m.userId));
  const newMentionIds = new Set(validatedMentions);
  const addedMentions = validatedMentions.filter((id) => !oldMentionIds.has(id));

  const comment = await prisma.$transaction(async (tx) => {
    await tx.taskCommentMention.deleteMany({
      where: { tenantId: ctx.tenantId, commentId },
    });

    if (validatedMentions.length > 0) {
      await tx.taskCommentMention.createMany({
        data: validatedMentions.map((userId) => ({
          tenantId: ctx.tenantId,
          commentId,
          userId,
        })),
      });
    }

    return tx.taskComment.update({
      where: { id: commentId },
      data: { body: normalizedBody },
      select: commentSelect,
    });
  });

  if (addedMentions.length > 0) {
    const actorDisplayName = await resolveActorDisplayName(ctx.tenantId, ctx.userId);
    await emitTaskMentionNotifications(task, {
      commentId: comment.id,
      commentExcerpt: mentionExcerpt(normalizedBody),
      actorUserId: ctx.userId,
      actorDisplayName,
      mentionedUserIds: addedMentions,
    });
  }

  const [dto] = await enrichTaskComments(ctx.tenantId, [comment]);
  return dto!;
}

export async function deleteTaskComment(
  ctx: TaskServiceContext,
  taskId: string,
  commentId: string,
): Promise<TaskCommentDto> {
  const task = await requireVisibleTask(ctx, taskId);
  const existing = await requireCommentForTask(ctx, taskId, commentId, {
    includeDeleted: true,
  });

  if (existing.deletedAt) {
    const [dto] = await enrichTaskComments(ctx.tenantId, [existing]);
    return dto!;
  }

  const isAuthor = existing.authorUserId === ctx.userId;
  const canModerate = canManageTask(ctx, authFromTaskRow(task));

  if (!isAuthor && !canModerate) {
    throw new TaskForbiddenError("Nur der Autor kann diesen Kommentar löschen.");
  }

  const comment = await prisma.taskComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
    select: commentSelect,
  });

  const [dto] = await enrichTaskComments(ctx.tenantId, [comment]);
  return dto!;
}

export async function getTaskCommentForTimeline(
  tenantId: string,
  taskId: string,
  whereCursor: Prisma.TaskCommentWhereInput,
  take: number,
): Promise<TaskCommentRecord[]> {
  return prisma.taskComment.findMany({
    where: {
      tenantId,
      taskId,
      ...whereCursor,
    },
    select: commentSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

export type { TaskCommentMentionDto };
