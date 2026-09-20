/**
 * AUFGABEN-02 — Task Center management queries (server-side filtering, batch enrichment).
 */

import type { Prisma, TaskContextType, TaskPriority, TaskStatus } from "@prisma/client";
import { TaskStatus as TaskStatusEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeSubtaskProgress } from "./subtask-rules";
import { sortPersonalTasks } from "./personal-ordering";
import type {
  PersonalTaskDto,
  TaskDto,
  TaskProgressDto,
  TaskServiceContext,
} from "./types";
import {
  buildTaskSeriesReadWhere,
  buildTaskVisibilityWhere,
  canViewAllTasks,
} from "./visibility";
import {
  endOfWeekSunday,
  getUpcomingHorizonEnd,
  isActiveTaskStatus,
  startOfLocalDay,
} from "./management-deadline";
import { formatTaskSeriesRecurrenceLabel } from "./management-labels";
import type {
  TaskManagementQueryState,
  TaskManagementSort,
  TaskManagementView,
} from "./management-navigation";
import {
  resolveTaskContextsBatch,
  type TaskContextPresentation,
} from "./context-presentation";

const TASK_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

const ACTIVE_STATUSES: TaskStatus[] = [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

export const TASK_MANAGEMENT_PAGE_SIZE = 25;

export type TaskManagementSummary = {
  open: number;
  overdue: number;
  dueThisWeek: number;
  myOpen: number;
};

export type TaskManagementListItem = {
  task: TaskDto;
  parentTask: { id: string; title: string } | null;
  subtasks: TaskDto[];
  progress: TaskProgressDto;
  seriesRecurrenceLabel: string | null;
  context: TaskContextPresentation | null;
  expandable: boolean;
};

export type TaskSeriesManagementRow = {
  id: string;
  title: string;
  status: string;
  recurrenceLabel: string;
  assigneeNames: string[];
  nextDueAt: string | null;
  openOccurrenceCount: number;
};

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

function mapPersonal(
  row: TaskRow,
  parentById: Map<string, { id: string; title: string }>,
): PersonalTaskDto {
  const dto = mapTask(row);
  const parent = row.parentTaskId ? parentById.get(row.parentTaskId) ?? null : null;
  return { ...dto, parentTask: parent };
}

function buildSecondaryFilters(
  ctx: TaskServiceContext,
  query: TaskManagementQueryState,
  now: Date,
  timeZone: string,
): Prisma.TaskWhereInput[] {
  const and: Prisma.TaskWhereInput[] = [];

  if (query.search) {
    and.push({
      title: { contains: query.search, mode: "insensitive" },
    });
  }

  if (query.status === "ACTIVE") {
    if (query.view !== "ERLEDIGT") {
      and.push({ status: { in: ACTIVE_STATUSES } });
    }
  } else if (query.status) {
    and.push({ status: query.status as TaskStatus });
  }

  if (query.assigneeUserId) {
    and.push({
      assignees: {
        some: { userId: query.assigneeUserId, tenantId: ctx.tenantId },
      },
    });
  }

  if (query.priority) {
    and.push({ priority: query.priority as TaskPriority });
  }

  if (query.contextType) {
    and.push({ contextType: query.contextType as TaskContextType });
  }

  if (query.recurring === "RECURRING") {
    and.push({ taskSeriesId: { not: null } });
  } else if (query.recurring === "SINGLE") {
    and.push({ taskSeriesId: null });
  }

  const todayStart = startOfLocalDay(now, timeZone);
  const weekEnd = endOfWeekSunday(now, timeZone);

  if (query.deadline === "OVERDUE") {
    and.push({
      dueAt: { lt: todayStart },
      status: { in: ACTIVE_STATUSES },
    });
  } else if (query.deadline === "THIS_WEEK") {
    and.push({
      dueAt: { gte: todayStart, lt: weekEnd },
      status: { in: ACTIVE_STATUSES },
    });
  } else if (query.deadline === "NO_DEADLINE") {
    and.push({ dueAt: null });
  }

  return and;
}

function buildViewWhere(
  ctx: TaskServiceContext,
  view: TaskManagementView,
  now: Date,
  timeZone: string,
): Prisma.TaskWhereInput[] {
  const todayStart = startOfLocalDay(now, timeZone);
  const upcomingEnd = getUpcomingHorizonEnd(now, timeZone);

  switch (view) {
    case "MEINE":
      return [
        {
          assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } },
          status: { in: ACTIVE_STATUSES },
        },
      ];
    case "ALLE":
      return [{ parentTaskId: null, status: { in: ACTIVE_STATUSES } }];
    case "UEBERFAELLIG":
      return [
        {
          dueAt: { lt: todayStart },
          status: { in: ACTIVE_STATUSES },
        },
      ];
    case "DEMNAECHST":
      return [
        {
          dueAt: { gte: todayStart, lt: upcomingEnd },
          status: { in: ACTIVE_STATUSES },
        },
      ];
    case "ERLEDIGT":
      return [{ status: TaskStatusEnum.DONE, parentTaskId: null }];
    case "WIEDERKEHREND":
      return [];
    default:
      return [{ parentTaskId: null }];
  }
}

function orderByForSort(sort: TaskManagementSort): Prisma.TaskOrderByWithRelationInput[] {
  switch (sort) {
    case "PRIORITY_DESC":
      return [{ priority: "desc" }, { dueAt: { sort: "asc", nulls: "last" } }];
    case "CREATED_DESC":
      return [{ createdAt: "desc" }];
    case "UPDATED_DESC":
      return [{ updatedAt: "desc" }];
    case "TITLE_ASC":
      return [{ title: "asc" }];
    case "DEADLINE_ASC":
    default:
      return [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
  }
}

function sortTaskRowsByPriority(rows: TaskRow[]): TaskRow[] {
  return [...rows].sort((a, b) => {
    const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (p !== 0) return p;
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }
    return 0;
  });
}

async function loadParentSummaries(
  tenantId: string,
  parentIds: string[],
): Promise<Map<string, { id: string; title: string }>> {
  if (parentIds.length === 0) return new Map();
  const parents = await prisma.task.findMany({
    where: { tenantId, id: { in: parentIds } },
    select: { id: true, title: true },
  });
  return new Map(parents.map((p) => [p.id, p]));
}

async function loadContextPresentationsForTasks(
  ctx: TaskServiceContext,
  tasks: TaskDto[],
  locale: string,
  timeZone: string,
): Promise<Map<string, TaskContextPresentation>> {
  const refs = tasks
    .filter((t) => t.contextType && t.contextId)
    .map((t) => ({
      contextType: t.contextType!,
      contextId: t.contextId!,
    }));
  if (refs.length === 0) return new Map();
  return resolveTaskContextsBatch(ctx, refs, locale, timeZone);
}

function contextForTask(
  task: TaskDto,
  map: Map<string, TaskContextPresentation>,
): TaskContextPresentation | null {
  if (!task.contextType || !task.contextId) return null;
  return map.get(`${task.contextType}:${task.contextId}`) ?? null;
}

async function batchEnrichRoots(
  ctx: TaskServiceContext,
  roots: TaskDto[],
  seriesLabels: Map<string, string>,
  locale: string,
  timeZone: string,
): Promise<TaskManagementListItem[]> {
  if (roots.length === 0) return [];

  const rootIds = roots.map((r) => r.id);
  const childWhere: Prisma.TaskWhereInput = {
    AND: [buildTaskVisibilityWhere(ctx), { parentTaskId: { in: rootIds } }],
  };
  const childRows = await prisma.task.findMany({
    where: childWhere,
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const childrenByParent = new Map<string, TaskDto[]>();
  for (const row of childRows) {
    const parentId = row.parentTaskId!;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(mapTask(row));
    childrenByParent.set(parentId, list);
  }

  const contextMap = await loadContextPresentationsForTasks(
    ctx,
    roots,
    locale,
    timeZone,
  );

  return roots.map((task) => {
    const subtasks = childrenByParent.get(task.id) ?? [];
    const progress = computeSubtaskProgress(subtasks.map((s) => ({ status: s.status })));
    const seriesRecurrenceLabel = task.taskSeriesId
      ? seriesLabels.get(task.taskSeriesId) ?? null
      : null;
    return {
      task,
      parentTask: null,
      subtasks,
      progress: {
        ...progress,
        percent: progress.totalCount === 0 ? 0 : progress.percent,
      },
      seriesRecurrenceLabel,
      context: contextForTask(task, contextMap),
      expandable: subtasks.length > 0,
    };
  });
}

async function batchEnrichPersonalRows(
  ctx: TaskServiceContext,
  personal: PersonalTaskDto[],
  seriesLabels: Map<string, string>,
  locale: string,
  timeZone: string,
): Promise<TaskManagementListItem[]> {
  const rootIdsNeedingChildren = personal
    .filter((p) => !p.parentTaskId)
    .map((p) => p.id);

  const childrenByParent = new Map<string, TaskDto[]>();
  if (rootIdsNeedingChildren.length > 0) {
    const childWhere: Prisma.TaskWhereInput = {
      AND: [
        buildTaskVisibilityWhere(ctx),
        { parentTaskId: { in: rootIdsNeedingChildren } },
      ],
    };
    const childRows = await prisma.task.findMany({
      where: childWhere,
      include: TASK_INCLUDE,
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    for (const row of childRows) {
      const parentId = row.parentTaskId!;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(mapTask(row));
      childrenByParent.set(parentId, list);
    }
  }

  const contextMap = await loadContextPresentationsForTasks(
    ctx,
    personal,
    locale,
    timeZone,
  );

  return personal.map((task) => {
    const subtasks = task.parentTaskId ? [] : childrenByParent.get(task.id) ?? [];
    const progress = computeSubtaskProgress(subtasks.map((s) => ({ status: s.status })));
    return {
      task,
      parentTask: task.parentTask,
      subtasks,
      progress: {
        ...progress,
        percent: progress.totalCount === 0 ? 0 : progress.percent,
      },
      seriesRecurrenceLabel: task.taskSeriesId
        ? seriesLabels.get(task.taskSeriesId) ?? null
        : null,
      context: contextForTask(task, contextMap),
      expandable: subtasks.length > 0,
    };
  });
}

async function loadSeriesRecurrenceLabels(
  tenantId: string,
  seriesIds: string[],
): Promise<Map<string, string>> {
  if (seriesIds.length === 0) return new Map();
  const rows = await prisma.taskSeries.findMany({
    where: { tenantId, id: { in: seriesIds } },
    select: {
      id: true,
      frequency: true,
      intervalCount: true,
      weekday: true,
      monthDay: true,
    },
  });
  return new Map(
    rows.map((s) => [
      s.id,
      formatTaskSeriesRecurrenceLabel({
        frequency: s.frequency,
        intervalCount: s.intervalCount,
        weekday: s.weekday,
        monthDay: s.monthDay,
      }),
    ]),
  );
}

export async function getTaskManagementSummary(
  ctx: TaskServiceContext,
  timeZone: string,
  now: Date = new Date(),
): Promise<TaskManagementSummary> {
  const visibility = buildTaskVisibilityWhere(ctx);
  const todayStart = startOfLocalDay(now, timeZone);
  const weekEnd = endOfWeekSunday(now, timeZone);

  const baseActive = {
    AND: [visibility, { status: { in: ACTIVE_STATUSES } }],
  };

  const [open, overdue, dueThisWeek, myOpen] = await Promise.all([
    prisma.task.count({
      where: { AND: [visibility, { parentTaskId: null, status: { in: ACTIVE_STATUSES } }] },
    }),
    prisma.task.count({
      where: {
        AND: [
          visibility,
          { dueAt: { lt: todayStart }, status: { in: ACTIVE_STATUSES } },
        ],
      },
    }),
    prisma.task.count({
      where: {
        AND: [
          visibility,
          {
            dueAt: { gte: todayStart, lt: weekEnd },
            status: { in: ACTIVE_STATUSES },
          },
        ],
      },
    }),
    prisma.task.count({
      where: {
        ...baseActive,
        assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } },
      },
    }),
  ]);

  return { open, overdue, dueThisWeek, myOpen };
}

export async function listTaskManagementItems(
  ctx: TaskServiceContext,
  query: TaskManagementQueryState,
  timeZone: string,
  locale: string,
  now: Date = new Date(),
): Promise<{
  items: TaskManagementListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
}> {
  if (query.view === "WIEDERKEHREND") {
    return { items: [], totalCount: 0, page: 1, pageCount: 1 };
  }

  const visibility = buildTaskVisibilityWhere(ctx);
  const viewFilters = buildViewWhere(ctx, query.view, now, timeZone);
  const secondary = buildSecondaryFilters(ctx, query, now, timeZone);

  const where: Prisma.TaskWhereInput = {
    AND: [visibility, ...viewFilters, ...secondary],
  };

  const totalCount = await prisma.task.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / TASK_MANAGEMENT_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const skip = (page - 1) * TASK_MANAGEMENT_PAGE_SIZE;

  let rows = await prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: orderByForSort(query.sort),
    skip,
    take: TASK_MANAGEMENT_PAGE_SIZE,
  });

  if (query.sort === "PRIORITY_DESC") {
    rows = sortTaskRowsByPriority(rows);
  }

  const seriesIds = [
    ...new Set(rows.map((r) => r.taskSeriesId).filter((id): id is string => Boolean(id))),
  ];
  const seriesLabels = await loadSeriesRecurrenceLabels(ctx.tenantId, seriesIds);

  const flatPersonalView =
    query.view === "MEINE" ||
    query.view === "UEBERFAELLIG" ||
    query.view === "DEMNAECHST";

  if (flatPersonalView) {
    const parentIds = [
      ...new Set(rows.map((r) => r.parentTaskId).filter((id): id is string => Boolean(id))),
    ];
    const parentById = await loadParentSummaries(ctx.tenantId, parentIds);
    const personal =
      query.view === "MEINE"
        ? sortPersonalTasks(rows.map((r) => mapPersonal(r, parentById)))
        : rows.map((r) => mapPersonal(r, parentById));
    const items = await batchEnrichPersonalRows(
      ctx,
      personal,
      seriesLabels,
      locale,
      timeZone,
    );
    return { items, totalCount, page, pageCount };
  }

  const roots = rows.filter((r) => !r.parentTaskId).map(mapTask);
  const items = await batchEnrichRoots(ctx, roots, seriesLabels, locale, timeZone);
  return { items, totalCount, page, pageCount };
}

export async function listTaskSeriesManagementRows(
  ctx: TaskServiceContext,
  query: TaskManagementQueryState,
): Promise<{ rows: TaskSeriesManagementRow[]; totalCount: number }> {
  const and: Prisma.TaskSeriesWhereInput[] = [{ tenantId: ctx.tenantId }];

  and.push(buildTaskSeriesReadWhere(ctx));

  if (query.search) {
    and.push({ title: { contains: query.search, mode: "insensitive" } });
  }

  const where: Prisma.TaskSeriesWhereInput = { AND: and };

  const seriesRows = await prisma.taskSeries.findMany({
    where,
    include: {
      assigneeTemplates: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      occurrences: {
        where: { status: { in: ACTIVE_STATUSES } },
        select: { dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
      _count: {
        select: {
          occurrences: {
            where: { status: { in: ACTIVE_STATUSES } },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const rows: TaskSeriesManagementRow[] = seriesRows.map((series) => ({
    id: series.id,
    title: series.title,
    status: series.status,
    recurrenceLabel: formatTaskSeriesRecurrenceLabel({
      frequency: series.frequency,
      intervalCount: series.intervalCount,
      weekday: series.weekday,
      monthDay: series.monthDay,
    }),
    assigneeNames: series.assigneeTemplates.map(
      (a) => `${a.user.firstName} ${a.user.lastName}`.trim(),
    ),
    nextDueAt: series.occurrences[0]?.dueAt?.toISOString() ?? null,
    openOccurrenceCount: series._count.occurrences,
  }));

  return { rows, totalCount: rows.length };
}

export function isTaskOverdue(
  task: { dueAt: string | null; status: TaskStatus },
  now: Date,
  timeZone: string,
): boolean {
  if (!task.dueAt || !isActiveTaskStatus(task.status)) return false;
  return new Date(task.dueAt) < startOfLocalDay(now, timeZone);
}
