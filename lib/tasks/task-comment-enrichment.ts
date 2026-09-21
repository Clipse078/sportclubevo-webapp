/**
 * AUFGABEN-06A/06B — Human-facing task comment DTO enrichment.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveAuditActorDisplayName } from "@/lib/registrations/actor-display";
import type { TaskCommentRecord } from "./task-comment-service";

export type TaskCommentMentionDto = {
  userId: string;
  displayName: string;
};

export type TaskCommentDto = {
  id: string;
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string | null;
  mentions: TaskCommentMentionDto[];
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
};

function auditActorSelect(tenantId: string) {
  return {
    firstName: true,
    lastName: true,
    email: true,
    person: {
      where: { tenantId },
      select: {
        firstName: true,
        lastName: true,
        displayName: true,
      },
    },
  } as const;
}

export async function enrichTaskComments(
  tenantId: string,
  comments: TaskCommentRecord[],
): Promise<TaskCommentDto[]> {
  if (comments.length === 0) return [];

  const userIds = new Set<string>();
  for (const comment of comments) {
    userIds.add(comment.authorUserId);
    for (const mention of comment.mentions) {
      userIds.add(mention.userId);
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: {
      id: true,
      ...auditActorSelect(tenantId),
    },
  });

  const displayByUserId = new Map<string, string>();
  for (const user of users) {
    displayByUserId.set(
      user.id,
      resolveAuditActorDisplayName(user) ?? user.email ?? "Unbekannt",
    );
  }

  return comments.map((comment) => {
    const isDeleted = comment.deletedAt !== null;
    const isEdited =
      !isDeleted && comment.updatedAt.getTime() > comment.createdAt.getTime() + 1000;

    const mentions: TaskCommentMentionDto[] = isDeleted
      ? []
      : comment.mentions.map((mention) => ({
          userId: mention.userId,
          displayName: displayByUserId.get(mention.userId) ?? "Unbekannt",
        }));

    return {
      id: comment.id,
      taskId: comment.taskId,
      authorUserId: comment.authorUserId,
      authorDisplayName: displayByUserId.get(comment.authorUserId) ?? "Unbekannt",
      body: isDeleted ? null : comment.body,
      mentions,
      isDeleted,
      isEdited,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  });
}

export async function hydrateTaskTimelineActors(
  tenantId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      ...auditActorSelect(tenantId),
    },
  });

  const displayByUserId = new Map<string, string>();
  for (const user of users) {
    displayByUserId.set(
      user.id,
      resolveAuditActorDisplayName(user) ?? user.email ?? "Unbekannt",
    );
  }
  return displayByUserId;
}
