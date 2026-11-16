import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { TaskServiceContext } from "./types";
import { requireVisibleTask } from "./task-access";
import { ParentHasSubtasksForDeleteError } from "./errors";

export type TaskDeletionImpact = {
  subtaskCount: number;
  sprintMembershipCount: number;
};

export type TaskDeletionResult = {
  taskId: string;
  title: string;
  impact: TaskDeletionImpact;
};

export async function getTaskDeletionImpact(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDeletionImpact | null> {
  try {
    await requireVisibleTask(ctx, taskId);
  } catch {
    return null;
  }

  const [subtaskCount, sprintMembershipCount] = await Promise.all([
    prisma.task.count({
      where: { tenantId: ctx.tenantId, parentTaskId: taskId },
    }),
    prisma.developmentSprintTaskMembership.count({
      where: { tenantId: ctx.tenantId, taskId, removedAt: null },
    }),
  ]);

  return { subtaskCount, sprintMembershipCount };
}

/**
 * Permanently deletes a single Aufgabe. Does not cascade-delete Unteraufgaben —
 * parent delete is blocked while any child row exists.
 */
export async function deleteTaskPermanently(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDeletionResult | null> {
  const existing = await requireVisibleTask(ctx, taskId);

  const subtaskCount = await prisma.task.count({
    where: { tenantId: ctx.tenantId, parentTaskId: existing.id },
  });
  if (subtaskCount > 0) {
    throw new ParentHasSubtasksForDeleteError();
  }

  const impact = await getTaskDeletionImpact(ctx, taskId);
  if (!impact) return null;

  await prisma.task.delete({
    where: { id: existing.id, tenantId: ctx.tenantId },
  });

  return {
    taskId: existing.id,
    title: existing.title,
    impact,
  };
}