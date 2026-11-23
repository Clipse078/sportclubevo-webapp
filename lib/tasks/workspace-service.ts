/**
 * AUFGABEN-03 — task workspace read model (single entry for detail UI).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { enrichTaskDtosWithResponsibleDisplayNames } from "./task-assignee-display";
import {
  formatTaskCreatorDisplayName,
  resolveTaskCreatorDisplayNamesByUserIds,
} from "./task-creator-display";
import { formatTaskSeriesRecurrenceLabel } from "./management-labels";
import { resolveTaskContextPresentation, type TaskContextPresentation } from "./context-presentation";
import { resolveTaskProvenance, type TaskProvenance } from "./task-provenance";
import {
  computeParentTaskProgress,
  countOpenEligibleSubtasks,
  deriveEffectiveParentStatus,
  nextRelevantSubtaskDeadline,
} from "./task-hierarchy-progress";
import { getTaskSeriesForRead } from "./task-series-service";
import { requireVisibleTask } from "./task-access";
import type {
  TaskDto,
  TaskProgressDto,
  TaskServiceContext,
} from "./types";
import { mapTaskRowToDto } from "./task-dto-mapper";
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
import {
  loadTaskAccessGrantSnapshot,
  type TaskAccessGrantSnapshot,
} from "./task-access-grants";
import {
  loadTaskWorkspaceAssociations,
  type TaskWorkspaceAssociations,
} from "./task-workspace-associations";

const TASK_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

function mapTask(row: TaskRow, ctx: TaskServiceContext): TaskDto {
  return mapTaskRowToDto(row, ctx.tenantPublicReferenceShortCode);
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

  return rows.map((row) => mapTask(row, ctx));
}

export type TaskWorkspaceCreator = {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
} | null;

export type TaskWorkspaceBundle = {
  task: TaskDto;
  parentTask: { id: string; title: string } | null;
  subtasks: TaskDto[];
  progress: TaskProgressDto;
  /** Derived status when parent has Teilaufgaben (stored status may lag). */
  effectiveStatus: import("@prisma/client").TaskStatus;
  openSubtaskCount: number;
  nextSubtaskDueAt: string | null;
  seriesRecurrenceLabel: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  canOpenSeriesWorkspace: boolean;
  context: TaskContextPresentation | null;
  provenance: TaskProvenance | null;
  creator: TaskWorkspaceCreator;
  capabilities: TaskWorkspaceCapabilities;
  follow: TaskFollowStateDto;
  documentReferences: TaskDocumentReferenceDto[];
  accessGrants: TaskAccessGrantSnapshot;
  associations: TaskWorkspaceAssociations;
};

export async function loadTaskWorkspace(
  ctx: TaskServiceContext,
  taskId: string,
  locale: string,
  timeZone: string,
  options?: { canDeletePermanently?: boolean },
): Promise<TaskWorkspaceBundle> {
  const visibleTask = await requireVisibleTask(ctx, taskId);
  let task = mapTask(visibleTask, ctx);

  const seriesRowPromise = task.taskSeriesId
    ? getTaskSeriesForRead(ctx, task.taskSeriesId).catch(() => null)
    : Promise.resolve(null);

  const [
    subtasks,
    parentTask,
    seriesRow,
    creatorUser,
    context,
    provenance,
    follow,
    documentReferences,
    accessGrants,
    associations,
  ] = await Promise.all([
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
    resolveTaskProvenance(ctx, task.contextType, task.contextId, {
      seriesOccurrenceKey: visibleTask.seriesOccurrenceKey,
    }),
    getTaskFollowStateForVisibleTask(ctx, visibleTask),
    listTaskDocumentReferencesForVisibleTask(ctx, visibleTask),
    loadTaskAccessGrantSnapshot(ctx.tenantId, task.id),
    loadTaskWorkspaceAssociations(
      ctx,
      task.id,
      task.primaryInitiativeId,
      task.contextType,
      task.contextId,
    ),
  ]);

  [task] = await enrichTaskDtosWithResponsibleDisplayNames(ctx.tenantId, [task]);
  const enrichedSubtasks = await enrichTaskDtosWithResponsibleDisplayNames(
    ctx.tenantId,
    subtasks,
  );

  const progress = task.parentTaskId
    ? {
        completedCount: 0,
        totalCount: 0,
        percent: 0,
        label: "—",
      }
    : computeParentTaskProgress({
        parentStatus: task.status,
        subtasks: enrichedSubtasks.map((s) => ({ status: s.status })),
      });

  const effectiveStatus = task.parentTaskId
    ? task.status
    : deriveEffectiveParentStatus(
        task.status,
        enrichedSubtasks.map((s) => ({ status: s.status })),
      );

  const openSubtaskCount = task.parentTaskId
    ? 0
    : countOpenEligibleSubtasks(enrichedSubtasks.map((s) => ({ status: s.status })));

  const nextSubtaskDueAt = task.parentTaskId
    ? null
    : nextRelevantSubtaskDeadline(
        enrichedSubtasks.map((s) => ({ status: s.status, dueAt: s.dueAt })),
      );

  const seriesRecurrenceLabel = seriesRow
    ? formatTaskSeriesRecurrenceLabel(seriesRow)
    : null;

  const creatorNames = await resolveTaskCreatorDisplayNamesByUserIds(
    ctx.tenantId,
    task.createdByUserId ? [task.createdByUserId] : [],
  );

  return {
    task,
    parentTask: parentTask ? { id: parentTask.id, title: parentTask.title } : null,
    subtasks: enrichedSubtasks,
    progress,
    effectiveStatus,
    openSubtaskCount,
    nextSubtaskDueAt,
    seriesRecurrenceLabel,
    seriesId: seriesRow?.id ?? task.taskSeriesId,
    seriesTitle: seriesRow?.title ?? null,
    canOpenSeriesWorkspace: Boolean(seriesRow),
    context,
    provenance,
    creator: creatorUser
      ? {
          userId: creatorUser.id,
          firstName: creatorUser.firstName,
          lastName: creatorUser.lastName,
          displayName: formatTaskCreatorDisplayName(
            creatorUser.id,
            creatorNames,
          ),
        }
      : null,
    capabilities: resolveTaskWorkspaceCapabilities(ctx, task, {
      canDeletePermanently: options?.canDeletePermanently,
    }),
    follow,
    documentReferences,
    accessGrants,
    associations,
  };
}
