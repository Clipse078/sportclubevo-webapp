/**
 * AUFGABEN-06C — explicit Task follow / unfollow (subscription only; never grants access).
 */

import { prisma } from "@/lib/db/prisma";
import { TaskForbiddenError, TaskValidationError } from "./errors";
import {
  requireVisibleTask,
  taskAuthorizationFromRow,
  type VisibleTaskRow,
} from "./task-access";
import {
  canReadTask,
  type TaskAuthorizationRecord,
} from "./task-authorization";
import type { TaskServiceContext } from "./types";

export type TaskFollowStateDto = {
  isFollowing: boolean;
  followerCount: number;
};

export function canFollowTask(
  ctx: TaskServiceContext,
  task: TaskAuthorizationRecord,
): boolean {
  return canReadTask(ctx, task);
}

async function assertActiveTenantMember(ctx: TaskServiceContext): Promise<void> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  if (!membership) {
    throw new TaskValidationError("Keine aktive Vereinsmitgliedschaft für diese Aktion.");
  }
}

export async function getTaskFollowStateForVisibleTask(
  ctx: TaskServiceContext,
  visibleTask: VisibleTaskRow,
): Promise<TaskFollowStateDto> {
  const taskId = visibleTask.id;
  const [followerCount, ownFollow] = await Promise.all([
    prisma.taskFollower.count({
      where: { tenantId: ctx.tenantId, taskId },
    }),
    prisma.taskFollower.findFirst({
      where: { tenantId: ctx.tenantId, taskId, userId: ctx.userId },
      select: { id: true },
    }),
  ]);

  return {
    isFollowing: Boolean(ownFollow),
    followerCount,
  };
}

export async function getTaskFollowState(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskFollowStateDto> {
  const visibleTask = await requireVisibleTask(ctx, taskId);
  return getTaskFollowStateForVisibleTask(ctx, visibleTask);
}

export async function followTask(ctx: TaskServiceContext, taskId: string): Promise<TaskFollowStateDto> {
  const task = await requireVisibleTask(ctx, taskId);
  const authRecord = taskAuthorizationFromRow(task);

  if (!canFollowTask(ctx, authRecord)) {
    throw new TaskForbiddenError("Diese Aufgabe kann nicht gefolgt werden.");
  }

  await assertActiveTenantMember(ctx);

  await prisma.taskFollower.upsert({
    where: {
      taskId_userId: { taskId, userId: ctx.userId },
    },
    create: {
      tenantId: ctx.tenantId,
      taskId,
      userId: ctx.userId,
    },
    update: {},
  });

  return getTaskFollowState(ctx, taskId);
}

export async function unfollowTask(ctx: TaskServiceContext, taskId: string): Promise<TaskFollowStateDto> {
  await requireVisibleTask(ctx, taskId);
  await assertActiveTenantMember(ctx);

  await prisma.taskFollower.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      taskId,
      userId: ctx.userId,
    },
  });

  return getTaskFollowState(ctx, taskId);
}

export async function listTaskFollowerUserIds(
  tenantId: string,
  taskId: string,
): Promise<string[]> {
  const rows = await prisma.taskFollower.findMany({
    where: { tenantId, taskId },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.userId);
}
