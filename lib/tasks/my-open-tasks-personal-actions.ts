/**
 * SCE-HOTFIX-LOGIN-01 R6 — bounded, minimal-projection open tasks for dashboard PersonalAction.
 * Does not use TASK_AUTH_INCLUDE; assignee scope is enforced in the WHERE clause.
 */

import { TaskStatus as TaskStatusEnum, type TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sortPersonalTasks } from "./personal-ordering";
import { loadAuthorizedParentTaskRefs } from "./visibility";
import type { ListTasksFilter, PersonalTaskDto, TaskServiceContext } from "./types";

/** Max open assignee rows considered before personal ordering (dashboard hot path). */
export const DASHBOARD_OPEN_TASK_CANDIDATE_CAP = 250;

const OPEN_STATUSES = [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS] as const;

const PERSONAL_ACTION_TASK_ROW_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueAt: true,
  createdAt: true,
  parentTaskId: true,
} as const;

type PersonalActionTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  dueAt: Date | null;
  createdAt: Date;
  parentTaskId: string | null;
};

function myOpenAssigneeTaskWhere(ctx: TaskServiceContext) {
  return {
    tenantId: ctx.tenantId,
    assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } },
    status: { in: [...OPEN_STATUSES] },
  };
}

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDueSoonWindow(now: Date): Date {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const soonLimit = new Date(endOfToday);
  soonLimit.setDate(soonLimit.getDate() + 3);
  return soonLimit;
}

async function loadOpenAssigneeTaskRowsBounded(
  ctx: TaskServiceContext,
  cap: number,
  now: Date,
): Promise<PersonalActionTaskRow[]> {
  const where = myOpenAssigneeTaskWhere(ctx);
  const total = await prisma.task.count({ where });
  if (total <= cap) {
    return prisma.task.findMany({
      where,
      select: PERSONAL_ACTION_TASK_ROW_SELECT,
    });
  }

  const todayStart = startOfToday(now);
  const dueSoonEnd = endOfDueSoonWindow(now);

  const overdueTake = Math.min(cap, Math.max(Math.ceil(cap * 0.45), 40));
  const dueSoonTake = Math.min(cap, Math.max(Math.ceil(cap * 0.35), 30));
  const futureTake = Math.min(cap, Math.max(Math.ceil(cap * 0.1), 15));
  const undatedTake = Math.min(cap, Math.max(Math.ceil(cap * 0.1), 15));

  const [overdue, dueSoon, futureDated, undated] = await Promise.all([
    prisma.task.findMany({
      where: { ...where, dueAt: { lt: todayStart } },
      select: PERSONAL_ACTION_TASK_ROW_SELECT,
      orderBy: { dueAt: "asc" },
      take: overdueTake,
    }),
    prisma.task.findMany({
      where: {
        ...where,
        dueAt: { gte: todayStart, lte: dueSoonEnd },
      },
      select: PERSONAL_ACTION_TASK_ROW_SELECT,
      orderBy: { dueAt: "asc" },
      take: dueSoonTake,
    }),
    prisma.task.findMany({
      where: { ...where, dueAt: { gt: dueSoonEnd } },
      select: PERSONAL_ACTION_TASK_ROW_SELECT,
      orderBy: { dueAt: "asc" },
      take: futureTake,
    }),
    prisma.task.findMany({
      where: { ...where, dueAt: null },
      select: PERSONAL_ACTION_TASK_ROW_SELECT,
      orderBy: { createdAt: "desc" },
      take: undatedTake,
    }),
  ]);

  const byId = new Map<string, PersonalActionTaskRow>();
  for (const row of [...overdue, ...dueSoon, ...futureDated, ...undated]) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function mapRowToPersonalTaskDto(
  ctx: TaskServiceContext,
  row: PersonalActionTaskRow,
  parent: { id: string; title: string } | null,
): PersonalTaskDto {
  return {
    id: row.id,
    tenantId: ctx.tenantId,
    title: row.title,
    description: null,
    status: row.status,
    priority: row.priority as PersonalTaskDto["priority"],
    dueAt: row.dueAt?.toISOString() ?? null,
    reminder1At: null,
    reminder2At: null,
    reminder1PresetKey: null,
    reminder2PresetKey: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: row.parentTaskId,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: "ASSIGNEES_ONLY",
    createdByUserId: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
    assignees: [],
    parentTask: parent,
  };
}

/**
 * Dashboard / PersonalAction bounded list — minimal SELECT, capped candidate load, parent refs after slice.
 */
export async function listMyOpenTasksForPersonalActions(
  ctx: TaskServiceContext,
  filter: Pick<ListTasksFilter, "limit" | "now"> & { limit: number },
): Promise<PersonalTaskDto[]> {
  const now = filter.now ?? new Date();
  const limit = filter.limit;

  const candidateCap = Math.min(
    DASHBOARD_OPEN_TASK_CANDIDATE_CAP,
    Math.max(limit * 4, limit),
  );

  const rows = await loadOpenAssigneeTaskRowsBounded(ctx, candidateCap, now);

  const orderable = rows.map((row) => ({
    id: row.id,
    dueAt: row.dueAt?.toISOString() ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    priority: row.priority,
  }));

  const orderedIds = sortPersonalTasks(orderable, now)
    .slice(0, limit)
    .map((t) => t.id);

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const sliced = orderedIds
    .map((id) => rowById.get(id))
    .filter((r): r is PersonalActionTaskRow => r != null);

  const parentIds = [
    ...new Set(
      sliced.map((r) => r.parentTaskId).filter((id): id is string => Boolean(id)),
    ),
  ];

  const parentById =
    parentIds.length > 0
      ? await loadAuthorizedParentTaskRefs(ctx, parentIds)
      : new Map<string, { id: string; title: string }>();

  return sliced.map((row) =>
    mapRowToPersonalTaskDto(
      ctx,
      row,
      row.parentTaskId ? parentById.get(row.parentTaskId) ?? null : null,
    ),
  );
}
