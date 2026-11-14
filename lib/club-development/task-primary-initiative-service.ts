import "server-only";

import { TaskContextType, type TaskContextType as TaskContextTypeValue } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireVisibleTask } from "@/lib/tasks/task-access";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { TASK_CONTEXT_LABELS, TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";

export class TaskPrimaryInitiativeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskPrimaryInitiativeError";
  }
}

export async function assertInitiativeOwnedByTenant(tenantId: string, initiativeId: string) {
  const row = await prisma.initiative.findFirst({
    where: { id: initiativeId, tenantId },
    select: { id: true, slug: true, title: true },
  });
  if (!row) throw new TaskPrimaryInitiativeError("Vorhaben nicht gefunden.");
  return row;
}

export async function setTaskPrimaryInitiative(
  tenantId: string,
  initiativeId: string,
  taskId: string,
  taskCtx: TaskServiceContext,
) {
  await assertInitiativeOwnedByTenant(tenantId, initiativeId);
  const task = await requireVisibleTask(taskCtx, taskId);
  if (task.tenantId !== tenantId) {
    throw new TaskPrimaryInitiativeError("Aufgabe nicht gefunden.");
  }
  if (
    task.contextType === TaskContextType.INITIATIVE &&
    task.contextId === initiativeId
  ) {
    throw new TaskPrimaryInitiativeError(
      "Diese Aufgabe ist bereits direkt diesem Vorhaben als Kontext zugeordnet.",
    );
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { primaryInitiativeId: initiativeId },
    select: { id: true, primaryInitiativeId: true, contextType: true, contextId: true },
  });
}

export async function clearTaskPrimaryInitiative(
  tenantId: string,
  initiativeId: string,
  taskId: string,
  taskCtx: TaskServiceContext,
) {
  await assertInitiativeOwnedByTenant(tenantId, initiativeId);
  await requireVisibleTask(taskCtx, taskId);

  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true, primaryInitiativeId: true, contextType: true, contextId: true },
  });
  if (!existing) throw new TaskPrimaryInitiativeError("Aufgabe nicht gefunden.");
  if (existing.primaryInitiativeId !== initiativeId) {
    throw new TaskPrimaryInitiativeError("Aufgabe ist nicht über Primär-Vorhaben verknüpft.");
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { primaryInitiativeId: null },
    select: { id: true, primaryInitiativeId: true, contextType: true, contextId: true },
  });
}

export type PrimaryInitiativeTaskRow = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  assigneeLabels: string[];
  href: string;
  contextLabel: string | null;
};

export async function listPrimaryInitiativeTasks(
  tenantId: string,
  initiativeId: string,
  taskCtx: TaskServiceContext,
): Promise<PrimaryInitiativeTaskRow[]> {
  await assertInitiativeOwnedByTenant(tenantId, initiativeId);

  const rows = await prisma.task.findMany({
    where: {
      tenantId,
      primaryInitiativeId: initiativeId,
      AND: [buildTaskReadWhere(taskCtx)],
    },
    select: {
      id: true,
      title: true,
      status: true,
      contextType: true,
      assignees: {
        select: { user: { select: { firstName: true, lastName: true } } },
        take: 3,
        orderBy: { assignedAt: "asc" },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: TASK_STATUS_LABELS[row.status],
    assigneeLabels: row.assignees
      .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim())
      .filter(Boolean),
    href: taskWorkspaceHref(row.id),
    contextLabel: row.contextType
      ? (TASK_CONTEXT_LABELS[row.contextType as TaskContextTypeValue] ?? row.contextType)
      : null,
  }));
}