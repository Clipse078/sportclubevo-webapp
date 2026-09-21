/**
 * AUFGABEN-03 — task workspace read model (single entry for detail UI).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatTaskSeriesRecurrenceLabel } from "./management-labels";
import { resolveTaskContextPresentation, type TaskContextPresentation } from "./context-presentation";
import { computeSubtaskProgress } from "./subtask-rules";
import { getTaskSeriesForRead } from "./task-series-service";
import { requireVisibleTask } from "./task-access";
import type {
  TaskDto,
  TaskProgressDto,
  TaskServiceContext,
} from "./types";
import {
  buildTaskVisibilityWhere,
  loadAuthorizedParentTaskRefs,
} from "./visibility";
import {
  resolveTaskWorkspaceCapabilities,
  type TaskWorkspaceCapabilities,
} from "./workspace-permissions";
import {
  getTaskFollowStateForVisibleTask,
  type TaskFollowStateDto,
} from "./task-follow-service";
import {
  listTaskDocumentReferencesForVisibleTask,
  type TaskDocumentReferenceDto,
} from "./task-document-reference-service";

const TASK_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

function mapTask(row: TaskRow): TaskDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt?.toISOString() ?? null,
    reminder1At: row.reminder1At?.toISOString() ?? null,
    reminder2At: row.reminder2At?.toISOString() ?? null,
    reminder1PresetKey: row.reminder1PresetKey,
    reminder2PresetKey: row.reminder2PresetKey,
    completedAt: row.completedAt?.toISOString() ?? null,
    contextType: row.contextType,
    contextId: row.contextId,
    parentTaskId: row.parentTaskId,
    taskSeriesId: row.taskSeriesId,
    orgUnitId: row.orgUnitId,
    visibilityScope: row.visibilityScope,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignees: row.assignees.map((a) => ({
      userId: a.userId,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      assignedAt: a.assignedAt.toISOString(),
    })),
  };
}

async function loadVisibleSubtasks(
  ctx: TaskServiceContext,
  parentTaskId: string,
): Promise<TaskDto[]> {
  const childWhere: Prisma.TaskWhereInput = {
    AND: [buildTaskVisibilityWhere(ctx), { parentTaskId }],
  };

  const rows = await prisma.task.findMany({
    where: childWhere,
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  return rows.map(mapTask);
}

export type TaskWorkspaceCreator = {
  userId: string;
  firstName: string;
  lastName: string;
} | null;

export type TaskWorkspaceBundle = {
  task: TaskDto;
  parentTask: { id: string; title: string } | null;
  subtasks: TaskDto[];
  progress: TaskProgressDto;
  seriesRecurrenceLabel: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  canOpenSeriesWorkspace: boolean;
  context: TaskContextPresentation | null;
  creator: TaskWorkspaceCreator;
  capabilities: TaskWorkspaceCapabilities;
  follow: TaskFollowStateDto;
  documentReferences: TaskDocumentReferenceDto[];
};

export async function loadTaskWorkspace(
  ctx: TaskServiceContext,
  taskId: string,
  locale: string,
  timeZone: string,
): Promise<TaskWorkspaceBundle> {
  const visibleTask = await requireVisibleTask(ctx, taskId);
  const task = mapTask(visibleTask);

  const seriesRowPromise = task.taskSeriesId
    ? getTaskSeriesForRead(ctx, task.taskSeriesId).catch(() => null)
    : Promise.resolve(null);

  const [subtasks, parentTask, seriesRow, creatorUser, context, follow, documentReferences] =
    await Promise.all([
    task.parentTaskId ? Promise.resolve([]) : loadVisibleSubtasks(ctx, task.id),
    task.parentTaskId
      ? loadAuthorizedParentTaskRefs(ctx, [task.parentTaskId]).then(
          (map) => map.get(task.parentTaskId!) ?? null,
        )
      : Promise.resolve(null),
    seriesRowPromise,
    task.createdByUserId
      ? prisma.user.findFirst({
          where: { id: task.createdByUserId },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve(null),
    resolveTaskContextPresentation(
      ctx,
      task.contextType,
      task.contextId,
      locale,
      timeZone,
    ),
    getTaskFollowStateForVisibleTask(ctx, visibleTask),
    listTaskDocumentReferencesForVisibleTask(ctx, visibleTask),
  ]);

  const progressSource = task.parentTaskId
    ? []
    : subtasks.map((s) => ({ status: s.status }));
  const progressRaw = computeSubtaskProgress(progressSource);

  const progress: TaskProgressDto = {
    ...progressRaw,
    percent: progressRaw.totalCount === 0 ? 0 : progressRaw.percent,
  };

  const seriesRecurrenceLabel = seriesRow
    ? formatTaskSeriesRecurrenceLabel(seriesRow)
    : null;

  return {
    task,
    parentTask: parentTask ? { id: parentTask.id, title: parentTask.title } : null,
    subtasks,
    progress,
    seriesRecurrenceLabel,
    seriesId: seriesRow?.id ?? task.taskSeriesId,
    seriesTitle: seriesRow?.title ?? null,
    canOpenSeriesWorkspace: Boolean(seriesRow),
    context,
    creator: creatorUser
      ? {
          userId: creatorUser.id,
          firstName: creatorUser.firstName,
          lastName: creatorUser.lastName,
        }
      : null,
    capabilities: resolveTaskWorkspaceCapabilities(ctx, task),
    follow,
    documentReferences,
  };
}
