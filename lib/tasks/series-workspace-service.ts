/**
 * AUFGABEN-03B — TaskSeries workspace read model.
 */

import type { Prisma, TaskStatus } from "@prisma/client";
import { TaskStatus as TaskStatusEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeSubtaskProgress } from "./subtask-rules";
import {
  formatSeriesDeadlineRule,
  formatSubtaskDueOffsetDays,
  formatTaskSeriesRecurrenceLabel,
  TASK_SERIES_EDIT_FUTURE_NOTICE,
  TASK_SERIES_STATUS_LABELS,
} from "./management-labels";
import {
  getNextScheduledOccurrenceLocalDate,
  localDateTimeToUtc,
} from "./recurrence-dates";
import { getTaskSeriesForRead } from "./task-series-service";
import type { TaskDto, TaskProgressDto, TaskServiceContext } from "./types";
import { hasTaskPermission } from "./visibility";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const OCCURRENCE_PAGE_SIZE = 25;

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

export type TaskSeriesSubtaskTemplateDto = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskDto["priority"];
  dueOffsetDays: number;
  dueOffsetLabel: string;
  orderIndex: number;
  assignees: Array<{ userId: string; firstName: string; lastName: string }>;
};

export type TaskSeriesOccurrenceRow = {
  task: TaskDto;
  progress: TaskProgressDto;
};

export type TaskSeriesWorkspaceBundle = {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof TASK_SERIES_STATUS_LABELS;
  statusLabel: string;
  priority: TaskDto["priority"];
  recurrenceLabel: string;
  deadlineRuleLabel: string;
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  frequency: string;
  intervalCount: number;
  weekday: string | null;
  monthDay: number | null;
  dueHour: number;
  dueMinute: number;
  createdAt: string;
  updatedAt: string;
  assigneeTemplates: Array<{ userId: string; firstName: string; lastName: string }>;
  subtaskTemplates: TaskSeriesSubtaskTemplateDto[];
  occurrences: TaskSeriesOccurrenceRow[];
  occurrenceTotalCount: number;
  occurrencePage: number;
  occurrencePageCount: number;
  nextOccurrenceLocalDate: string | null;
  nextOccurrenceDueAt: string | null;
  canManage: boolean;
  editFutureNotice: string;
};

async function loadOccurrenceProgress(
  tenantId: string,
  parentIds: string[],
): Promise<Map<string, TaskProgressDto>> {
  if (!parentIds.length) return new Map();

  const children = await prisma.task.findMany({
    where: { tenantId, parentTaskId: { in: parentIds } },
    select: { parentTaskId: true, status: true },
  });

  const byParent = new Map<string, TaskStatus[]>();
  for (const child of children) {
    if (!child.parentTaskId) continue;
    const list = byParent.get(child.parentTaskId) ?? [];
    list.push(child.status);
    byParent.set(child.parentTaskId, list);
  }

  const result = new Map<string, TaskProgressDto>();
  for (const parentId of parentIds) {
    const raw = computeSubtaskProgress(
      (byParent.get(parentId) ?? []).map((status) => ({ status })),
    );
    result.set(parentId, {
      ...raw,
      percent: raw.totalCount === 0 ? 0 : raw.percent,
    });
  }
  return result;
}

export async function loadTaskSeriesWorkspace(
  ctx: TaskServiceContext,
  seriesId: string,
  occurrencePage = 1,
  now: Date = new Date(),
): Promise<TaskSeriesWorkspaceBundle> {
  const series = await getTaskSeriesForRead(ctx, seriesId);
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  const occurrenceTotalCount = await prisma.task.count({
    where: {
      tenantId: ctx.tenantId,
      taskSeriesId: series.id,
      parentTaskId: null,
    },
  });

  const occurrencePageCount = Math.max(
    1,
    Math.ceil(occurrenceTotalCount / OCCURRENCE_PAGE_SIZE),
  );
  const page = Math.min(Math.max(1, occurrencePage), occurrencePageCount);
  const skip = (page - 1) * OCCURRENCE_PAGE_SIZE;

  const occurrenceRows = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      taskSeriesId: series.id,
      parentTaskId: null,
    },
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: OCCURRENCE_PAGE_SIZE,
  });

  const progressByParent = await loadOccurrenceProgress(
    ctx.tenantId,
    occurrenceRows.map((r) => r.id),
  );

  const nextLocal = getNextScheduledOccurrenceLocalDate(series, now);
  const nextOccurrenceDueAt = nextLocal
    ? localDateTimeToUtc(nextLocal, series.dueHour, series.dueMinute, series.timezone).toISOString()
    : null;

  const assigneeUsers = await prisma.user.findMany({
    where: {
      id: {
        in: series.assigneeTemplates.map((a) => a.userId),
      },
    },
    select: { id: true, firstName: true, lastName: true },
  });
  const userById = new Map(assigneeUsers.map((u) => [u.id, u]));

  const subtaskAssigneeIds = [
    ...new Set(
      series.subtaskTemplates.flatMap((t) => t.assignees.map((a) => a.userId)),
    ),
  ];
  const subtaskUsers =
    subtaskAssigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: subtaskAssigneeIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const subtaskUserById = new Map(subtaskUsers.map((u) => [u.id, u]));

  return {
    id: series.id,
    title: series.title,
    description: series.description,
    status: series.status,
    statusLabel: TASK_SERIES_STATUS_LABELS[series.status],
    priority: series.priority,
    recurrenceLabel: formatTaskSeriesRecurrenceLabel(series),
    deadlineRuleLabel: formatSeriesDeadlineRule(series.dueHour, series.dueMinute),
    timezone: series.timezone,
    startsOn: series.startsOn?.toISOString() ?? null,
    endsOn: series.endsOn?.toISOString() ?? null,
    frequency: series.frequency,
    intervalCount: series.intervalCount,
    weekday: series.weekday,
    monthDay: series.monthDay,
    dueHour: series.dueHour,
    dueMinute: series.dueMinute,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
    assigneeTemplates: series.assigneeTemplates.map((a) => {
      const user = userById.get(a.userId);
      return {
        userId: a.userId,
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
      };
    }),
    subtaskTemplates: series.subtaskTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueOffsetDays: t.dueOffsetDays,
      dueOffsetLabel: formatSubtaskDueOffsetDays(t.dueOffsetDays),
      orderIndex: t.orderIndex,
      assignees: t.assignees.map((a) => {
        const user = subtaskUserById.get(a.userId);
        return {
          userId: a.userId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
        };
      }),
    })),
    occurrences: occurrenceRows.map((row) => ({
      task: mapTask(row),
      progress: progressByParent.get(row.id) ?? {
        completedCount: 0,
        totalCount: 0,
        percent: 0,
        label: "0 / 0 erledigt",
      },
    })),
    occurrenceTotalCount,
    occurrencePage: page,
    occurrencePageCount,
    nextOccurrenceLocalDate: nextLocal,
    nextOccurrenceDueAt,
    canManage,
    editFutureNotice: TASK_SERIES_EDIT_FUTURE_NOTICE,
  };
}

export async function countOpenSeriesOccurrences(
  tenantId: string,
  seriesId: string,
): Promise<number> {
  return prisma.task.count({
    where: {
      tenantId,
      taskSeriesId: seriesId,
      parentTaskId: null,
      status: { in: [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS] },
    },
  });
}
