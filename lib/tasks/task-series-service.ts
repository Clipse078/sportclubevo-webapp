/**
 * AUFGABEN-01B — recurrence series + bounded occurrence generation.
 */

import {
  Prisma,
  type TaskPriority,
  type TaskRecurrenceFrequency,
  type TaskSeriesWeekday,
  type TaskVisibilityScope,
} from "@prisma/client";
import { TaskSeriesStatus, TaskStatus as TaskStatusEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskNotFoundError, TaskValidationError } from "./errors";
import {
  addDaysToLocalDateIso,
  buildSeriesOccurrenceKey,
  listOccurrenceLocalDatesForSeries,
  localDateTimeToUtc,
} from "./recurrence-dates";
import type { TaskServiceContext } from "./types";
import {
  buildTaskSeriesReadWhere,
  canManageTaskSeries,
  hasTaskPermission,
} from "./visibility";
import {
  computeNewAssigneeRows,
  emitTaskAssignmentNotifications,
} from "@/lib/notifications/task-producer";

const SERIES_INCLUDE = {
  assigneeTemplates: true,
  subtaskTemplates: {
    orderBy: { orderIndex: "asc" as const },
    include: { assignees: true },
  },
} satisfies Prisma.TaskSeriesInclude;

type SeriesRow = Prisma.TaskSeriesGetPayload<{ include: typeof SERIES_INCLUDE }>;

export type TaskSeriesSubtaskTemplateInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueOffsetDays?: number;
  assigneeUserIds?: string[];
};

export type CreateTaskSeriesInput = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  frequency: TaskRecurrenceFrequency;
  intervalCount?: number;
  weekday?: TaskSeriesWeekday | null;
  monthDay?: number | null;
  dueHour?: number;
  dueMinute?: number;
  timezone: string;
  startsOn?: Date | null;
  endsOn?: Date | null;
  assigneeUserIds?: string[];
  subtaskTemplates?: TaskSeriesSubtaskTemplateInput[];
};

export type UpdateTaskSeriesInput = Partial<CreateTaskSeriesInput> & {
  subtaskTemplates?: TaskSeriesSubtaskTemplateInput[];
};

function assertTenantWideSeriesManage(ctx: TaskServiceContext) {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)) {
    throw new TaskForbiddenError("Missing tasks.manage");
  }
}

function assertSeriesManage(
  ctx: TaskServiceContext,
  series: {
    tenantId: string;
    createdByUserId: string | null;
    visibilityScope: TaskVisibilityScope;
    orgUnitId: string | null;
    assigneeTemplates: { userId: string }[];
  },
) {
  if (
    !canManageTaskSeries(ctx, {
      tenantId: series.tenantId,
      createdByUserId: series.createdByUserId,
      visibilityScope: series.visibilityScope,
      orgUnitId: series.orgUnitId,
      assigneeUserIds: series.assigneeTemplates.map((a) => a.userId),
    })
  ) {
    throw new TaskForbiddenError("Missing tasks.manage for this series");
  }
}

async function validateAssigneeUserIds(tenantId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  const unique = [...new Set(userIds)];
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, userId: { in: unique }, isActive: true },
    select: { userId: true },
  });
  if (memberships.length !== unique.length) {
    throw new TaskValidationError(
      "One or more assignees are not active members of this tenant",
    );
  }
}

async function requireSeries(ctx: TaskServiceContext, seriesId: string): Promise<SeriesRow> {
  const series = await prisma.taskSeries.findFirst({
    where: { id: seriesId, tenantId: ctx.tenantId },
    include: SERIES_INCLUDE,
  });
  if (!series) throw new TaskNotFoundError(seriesId);
  return series;
}

function buildSeriesReadWhere(ctx: TaskServiceContext): Prisma.TaskSeriesWhereInput {
  return buildTaskSeriesReadWhere(ctx);
}

export async function getTaskSeriesForRead(ctx: TaskServiceContext, seriesId: string) {
  const series = await prisma.taskSeries.findFirst({
    where: { AND: [buildSeriesReadWhere(ctx), { id: seriesId }] },
    include: SERIES_INCLUDE,
  });
  if (!series) throw new TaskNotFoundError(seriesId);
  return series;
}

async function replaceSubtaskTemplates(
  tx: Prisma.TransactionClient,
  ctx: TaskServiceContext,
  seriesId: string,
  templates: TaskSeriesSubtaskTemplateInput[],
) {
  const existing = await tx.taskSeriesSubtaskTemplate.findMany({
    where: { seriesId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (existing.length) {
    await tx.taskSeriesSubtaskAssigneeTemplate.deleteMany({
      where: { templateId: { in: existing.map((e) => e.id) }, tenantId: ctx.tenantId },
    });
    await tx.taskSeriesSubtaskTemplate.deleteMany({
      where: { seriesId, tenantId: ctx.tenantId },
    });
  }

  for (const [index, template] of templates.entries()) {
    await validateAssigneeUserIds(ctx.tenantId, template.assigneeUserIds ?? []);
    const createdTemplate = await tx.taskSeriesSubtaskTemplate.create({
      data: {
        tenantId: ctx.tenantId,
        seriesId,
        title: template.title.trim(),
        description: template.description?.trim() || null,
        priority: template.priority ?? "NORMAL",
        dueOffsetDays: template.dueOffsetDays ?? 0,
        orderIndex: index,
      },
    });
    const assignees = [...new Set(template.assigneeUserIds ?? [])];
    if (assignees.length) {
      await tx.taskSeriesSubtaskAssigneeTemplate.createMany({
        data: assignees.map((userId) => ({
          tenantId: ctx.tenantId,
          templateId: createdTemplate.id,
          userId,
        })),
      });
    }
  }
}

async function recordSeriesAudit(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    actorUserId: string;
    seriesId: string;
    action: string;
    beforeJson?: unknown;
    afterJson?: unknown;
  },
) {
  await writeAuditRecord(tx, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "tasks",
    entityType: "TaskSeries",
    entityId: input.seriesId,
    action: input.action,
    beforeJson: input.beforeJson,
    afterJson: input.afterJson,
  });
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

function validateSeriesShape(input: CreateTaskSeriesInput) {
  if (!input.title.trim()) {
    throw new TaskValidationError("title is required");
  }
  const interval = input.intervalCount ?? 1;
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new TaskValidationError("intervalCount must be greater than 0");
  }
  if (input.frequency === "WEEKLY" && !input.weekday) {
    throw new TaskValidationError("weekday is required for WEEKLY series");
  }
  if (input.frequency === "MONTHLY") {
    if (!input.monthDay) {
      throw new TaskValidationError("monthDay is required for MONTHLY series");
    }
    if (input.monthDay < 1 || input.monthDay > 28) {
      throw new TaskValidationError("monthDay must be between 1 and 28");
    }
  }
}

export async function createTaskSeries(
  ctx: TaskServiceContext,
  input: CreateTaskSeriesInput,
) {
  assertTenantWideSeriesManage(ctx);
  validateSeriesShape(input);

  const parentAssignees = [...new Set(input.assigneeUserIds ?? [])];
  await validateAssigneeUserIds(ctx.tenantId, parentAssignees);

  for (const template of input.subtaskTemplates ?? []) {
    await validateAssigneeUserIds(ctx.tenantId, template.assigneeUserIds ?? []);
  }

  return prisma.$transaction(async (tx) => {
    const series = await tx.taskSeries.create({
      data: {
        tenantId: ctx.tenantId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority ?? "NORMAL",
        frequency: input.frequency,
        intervalCount: input.intervalCount ?? 1,
        weekday: input.weekday ?? null,
        monthDay: input.monthDay ?? null,
        dueHour: input.dueHour ?? 23,
        dueMinute: input.dueMinute ?? 59,
        timezone: input.timezone,
        startsOn: input.startsOn ?? null,
        endsOn: input.endsOn ?? null,
        createdByUserId: ctx.userId,
        status: TaskSeriesStatus.ACTIVE,
      },
    });

    if (parentAssignees.length) {
      await tx.taskSeriesAssigneeTemplate.createMany({
        data: parentAssignees.map((userId) => ({
          tenantId: ctx.tenantId,
          seriesId: series.id,
          userId,
        })),
      });
    }

    for (const [index, template] of (input.subtaskTemplates ?? []).entries()) {
      const createdTemplate = await tx.taskSeriesSubtaskTemplate.create({
        data: {
          tenantId: ctx.tenantId,
          seriesId: series.id,
          title: template.title.trim(),
          description: template.description?.trim() || null,
          priority: template.priority ?? "NORMAL",
          dueOffsetDays: template.dueOffsetDays ?? 0,
          orderIndex: index,
        },
      });
      const assignees = [...new Set(template.assigneeUserIds ?? [])];
      if (assignees.length) {
        await tx.taskSeriesSubtaskAssigneeTemplate.createMany({
          data: assignees.map((userId) => ({
            tenantId: ctx.tenantId,
            templateId: createdTemplate.id,
            userId,
          })),
        });
      }
    }

    await recordSeriesAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      seriesId: series.id,
      action: "TASK_SERIES_CREATED",
      afterJson: { title: series.title, frequency: series.frequency },
    });

    return tx.taskSeries.findFirstOrThrow({
      where: { id: series.id },
      include: SERIES_INCLUDE,
    });
  });
}

export async function updateTaskSeries(
  ctx: TaskServiceContext,
  seriesId: string,
  input: UpdateTaskSeriesInput,
) {
  const existing = await getTaskSeriesForRead(ctx, seriesId);
  assertSeriesManage(ctx, existing);

  if (input.frequency || input.weekday !== undefined || input.monthDay !== undefined) {
    validateSeriesShape({
      title: existing.title,
      frequency: input.frequency ?? existing.frequency,
      weekday: input.weekday !== undefined ? input.weekday : existing.weekday,
      monthDay: input.monthDay !== undefined ? input.monthDay : existing.monthDay,
      timezone: input.timezone ?? existing.timezone,
    });
  }

  if (input.assigneeUserIds) {
    await validateAssigneeUserIds(ctx.tenantId, input.assigneeUserIds);
  }

  if (input.subtaskTemplates) {
    for (const template of input.subtaskTemplates) {
      await validateAssigneeUserIds(ctx.tenantId, template.assigneeUserIds ?? []);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.taskSeries.update({
      where: { id: existing.id },
      data: {
        title: input.title?.trim() ?? undefined,
        description:
          input.description !== undefined
            ? input.description?.trim() || null
            : undefined,
        priority: input.priority,
        frequency: input.frequency,
        intervalCount: input.intervalCount,
        weekday: input.weekday !== undefined ? input.weekday : undefined,
        monthDay: input.monthDay !== undefined ? input.monthDay : undefined,
        dueHour: input.dueHour,
        dueMinute: input.dueMinute,
        timezone: input.timezone,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
      },
      include: SERIES_INCLUDE,
    });

    if (input.assigneeUserIds) {
      await tx.taskSeriesAssigneeTemplate.deleteMany({
        where: { seriesId: existing.id, tenantId: ctx.tenantId },
      });
      if (input.assigneeUserIds.length) {
        await tx.taskSeriesAssigneeTemplate.createMany({
          data: input.assigneeUserIds.map((userId) => ({
            tenantId: ctx.tenantId,
            seriesId: existing.id,
            userId,
          })),
        });
      }
    }

    if (input.subtaskTemplates) {
      await replaceSubtaskTemplates(tx, ctx, existing.id, input.subtaskTemplates);
    }

    await recordSeriesAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      seriesId: existing.id,
      action: "TASK_SERIES_UPDATED",
      beforeJson: { title: existing.title },
      afterJson: { title: updated.title },
    });

    return tx.taskSeries.findFirstOrThrow({
      where: { id: existing.id },
      include: SERIES_INCLUDE,
    });
  });
}

async function setSeriesStatus(
  ctx: TaskServiceContext,
  seriesId: string,
  status: TaskSeriesStatus,
  auditAction: string,
) {
  const existing = await getTaskSeriesForRead(ctx, seriesId);
  assertSeriesManage(ctx, existing);

  if (status === TaskSeriesStatus.PAUSED && existing.status !== TaskSeriesStatus.ACTIVE) {
    throw new TaskValidationError("Only ACTIVE series can be paused");
  }
  if (
    status === TaskSeriesStatus.ACTIVE &&
    auditAction === "TASK_SERIES_RESUMED" &&
    existing.status !== TaskSeriesStatus.PAUSED
  ) {
    throw new TaskValidationError("Only PAUSED series can be resumed");
  }
  if (
    status === TaskSeriesStatus.ENDED &&
    existing.status === TaskSeriesStatus.ENDED
  ) {
    throw new TaskValidationError("Series is already ended");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.taskSeries.update({
      where: { id: existing.id },
      data: { status },
      include: SERIES_INCLUDE,
    });
    await recordSeriesAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      seriesId: existing.id,
      action: auditAction,
      beforeJson: { status: existing.status },
      afterJson: { status },
    });
    return updated;
  });
}

export function pauseTaskSeries(ctx: TaskServiceContext, seriesId: string) {
  return setSeriesStatus(ctx, seriesId, TaskSeriesStatus.PAUSED, "TASK_SERIES_PAUSED");
}

export function resumeTaskSeries(ctx: TaskServiceContext, seriesId: string) {
  return setSeriesStatus(ctx, seriesId, TaskSeriesStatus.ACTIVE, "TASK_SERIES_RESUMED");
}

export function endTaskSeries(ctx: TaskServiceContext, seriesId: string) {
  return setSeriesStatus(ctx, seriesId, TaskSeriesStatus.ENDED, "TASK_SERIES_ENDED");
}

async function createOccurrenceTree(
  tx: Prisma.TransactionClient,
  ctx: TaskServiceContext,
  series: SeriesRow,
  localDateIso: string,
) {
  const occurrenceKey = buildSeriesOccurrenceKey(series.id, localDateIso);
  const existing = await tx.task.findFirst({
    where: { tenantId: ctx.tenantId, seriesOccurrenceKey: occurrenceKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const parentDueAt = localDateTimeToUtc(
    localDateIso,
    series.dueHour,
    series.dueMinute,
    series.timezone,
  );

  const occurrenceOrgUnitId = series.orgUnitId;
  const occurrenceVisibilityScope = series.visibilityScope;

  let parent: { id: string };
  try {
    parent = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        title: series.title,
        description: series.description,
        priority: series.priority,
        status: TaskStatusEnum.OPEN,
        dueAt: parentDueAt,
        taskSeriesId: series.id,
        seriesOccurrenceKey: occurrenceKey,
        orgUnitId: occurrenceOrgUnitId,
        visibilityScope: occurrenceVisibilityScope,
        createdByUserId: ctx.userId,
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const raced = await tx.task.findFirst({
        where: { tenantId: ctx.tenantId, seriesOccurrenceKey: occurrenceKey },
        select: { id: true },
      });
      if (raced) return raced.id;
    }
    throw error;
  }

  const parentAssignees = series.assigneeTemplates.map((a) => a.userId);
  const assignedAt = new Date();

  if (parentAssignees.length) {
    await tx.taskAssignee.createMany({
      data: parentAssignees.map((userId) => ({
        tenantId: ctx.tenantId,
        taskId: parent.id,
        userId,
        assignedByUserId: ctx.userId,
        assignedAt,
      })),
    });
  }

  const assignmentContext = {
    actorUserId: ctx.userId,
    seriesGenerated: true as const,
  };
  if (parentAssignees.length) {
    await emitTaskAssignmentNotifications(tx, {
      tenantId: ctx.tenantId,
      taskId: parent.id,
      taskTitle: series.title,
      isSubtask: false,
      assigneeRows: computeNewAssigneeRows([], parentAssignees, assignedAt),
      context: assignmentContext,
      dueAt: parentDueAt,
    });
  }

  for (const template of series.subtaskTemplates) {
    const childDueLocal = addDaysToLocalDateIso(localDateIso, template.dueOffsetDays);
    const childDueAt = localDateTimeToUtc(
      childDueLocal,
      series.dueHour,
      series.dueMinute,
      series.timezone,
    );

    const child = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        parentTaskId: parent.id,
        title: template.title,
        description: template.description,
        priority: template.priority,
        status: TaskStatusEnum.OPEN,
        dueAt: childDueAt,
        orgUnitId: occurrenceOrgUnitId,
        visibilityScope: occurrenceVisibilityScope,
        createdByUserId: ctx.userId,
      },
    });

    const childAssignees = template.assignees.map((a) => a.userId);
    if (childAssignees.length) {
      await tx.taskAssignee.createMany({
        data: childAssignees.map((userId) => ({
          tenantId: ctx.tenantId,
          taskId: child.id,
          userId,
          assignedByUserId: ctx.userId,
          assignedAt,
        })),
      });

      await emitTaskAssignmentNotifications(tx, {
        tenantId: ctx.tenantId,
        taskId: child.id,
        taskTitle: template.title,
        isSubtask: true,
        assigneeRows: computeNewAssigneeRows([], childAssignees, assignedAt),
        context: assignmentContext,
        dueAt: childDueAt,
      });
    }
  }

  await writeAuditRecord(tx, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    moduleKey: "tasks",
    entityType: "Task",
    entityId: parent.id,
    action: "TASK_OCCURRENCE_GENERATED",
    afterJson: { seriesId: series.id, occurrenceKey, localDateIso },
  });

  return parent.id;
}

export async function generateTaskOccurrencesInternal(
  tenantId: string,
  actorUserId: string,
  seriesId?: string,
): Promise<{ generatedTaskIds: string[] }> {
  const ctx: TaskServiceContext = {
    tenantId,
    userId: actorUserId,
    permissionKeys: [PERMISSIONS.TASKS_MANAGE],
  };

  const seriesList = await prisma.taskSeries.findMany({
    where: {
      tenantId,
      status: TaskSeriesStatus.ACTIVE,
      ...(seriesId ? { id: seriesId } : {}),
    },
    include: SERIES_INCLUDE,
  });

  if (seriesId && seriesList.length === 0) {
    throw new TaskNotFoundError(seriesId);
  }

  const generatedTaskIds: string[] = [];

  for (const series of seriesList) {
    const localDates = listOccurrenceLocalDatesForSeries(series);
    for (const localDateIso of localDates) {
      const taskId = await prisma.$transaction(async (tx) =>
        createOccurrenceTree(tx, ctx, series, localDateIso),
      );
      generatedTaskIds.push(taskId);
    }
  }

  return { generatedTaskIds };
}

export async function generateTaskOccurrences(
  ctx: TaskServiceContext,
  seriesId?: string,
): Promise<{ generatedTaskIds: string[] }> {
  if (seriesId) {
    const series = await getTaskSeriesForRead(ctx, seriesId);
    assertSeriesManage(ctx, series);
  } else {
    assertTenantWideSeriesManage(ctx);
  }
  return generateTaskOccurrencesInternal(ctx.tenantId, ctx.userId, seriesId);
}
