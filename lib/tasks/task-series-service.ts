/**
 * AUFGABEN-01B — recurrence series + bounded occurrence generation.
 */

import {
  Prisma,
  type TaskPriority,
  type TaskRecurrenceFrequency,
  type TaskSeriesWeekday,
} from "@prisma/client";
import {
  TaskSeriesStatus,
  TaskStatus as TaskStatusEnum,
  TaskVisibilityScope,
} from "@prisma/client";
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
import {
  normalizeTaskOrgVisibilityState,
  validateTaskOrgVisibilityMutation,
} from "./task-org-mutation-policy";
import {
  replaceTaskSeriesAccessGrants,
  snapshotSeriesAccessGrantsToOccurrence,
  validateTaskAccessGrantMutation,
} from "./task-access-grants";
import { resolvePropagatedTaskOrgVisibility } from "./task-org-propagation";
import { resolveTaskReminderSchedule } from "./task-reminder-schedule";

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
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
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
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
  timezone: string;
  startsOn?: Date | null;
  endsOn?: Date | null;
  assigneeUserIds?: string[];
  subtaskTemplates?: TaskSeriesSubtaskTemplateInput[];
  orgUnitId?: string | null;
  orgUnitGrantIds?: string[];
  viewerUserGrantIds?: string[];
  visibilityScope?: TaskVisibilityScope;
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
  const { assertEligibleTaskAssigneeUserIds } = await import("./eligible-task-assignee-persons");
  try {
    await assertEligibleTaskAssigneeUserIds(tenantId, userIds);
  } catch {
    throw new TaskValidationError(
      "One or more assignees are not eligible Person-linked members of this tenant",
    );
  }
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
        reminder1PresetKey: template.reminder1PresetKey ?? null,
        reminder2PresetKey: template.reminder2PresetKey ?? null,
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

  const orgVisibility = await validateTaskOrgVisibilityMutation(
    ctx,
    normalizeTaskOrgVisibilityState(input.visibilityScope, input.orgUnitId),
    { mode: "create" },
  );
  const accessGrants = await validateTaskAccessGrantMutation(ctx.tenantId, {
    visibilityScope: orgVisibility.visibilityScope,
    orgUnitGrantIds:
      input.orgUnitGrantIds ??
      (orgVisibility.orgUnitId ? [orgVisibility.orgUnitId] : undefined),
    viewerUserGrantIds: input.viewerUserGrantIds,
  });
  const primaryOrgUnitId =
    orgVisibility.visibilityScope === TaskVisibilityScope.ORG_UNIT
      ? accessGrants.orgUnitIds[0] ?? orgVisibility.orgUnitId
      : null;

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
        reminder1PresetKey: input.reminder1PresetKey ?? null,
        reminder2PresetKey: input.reminder2PresetKey ?? null,
        timezone: input.timezone,
        startsOn: input.startsOn ?? null,
        endsOn: input.endsOn ?? null,
        orgUnitId: primaryOrgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
        createdByUserId: ctx.userId,
        status: TaskSeriesStatus.ACTIVE,
      },
    });

    await replaceTaskSeriesAccessGrants(
      tx,
      ctx.tenantId,
      series.id,
      orgVisibility.visibilityScope,
      accessGrants,
    );

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
          reminder1PresetKey: template.reminder1PresetKey ?? null,
          reminder2PresetKey: template.reminder2PresetKey ?? null,
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
      afterJson: {
        title: series.title,
        frequency: series.frequency,
        orgUnitId: orgVisibility.orgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
      },
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

  const orgVisibilityMutation =
    input.orgUnitId !== undefined ||
    input.visibilityScope !== undefined ||
    input.orgUnitGrantIds !== undefined ||
    input.viewerUserGrantIds !== undefined;
  let nextOrgVisibility:
    | Awaited<ReturnType<typeof validateTaskOrgVisibilityMutation>>
    | null = null;
  let nextAccessGrants: Awaited<ReturnType<typeof validateTaskAccessGrantMutation>> | null =
    null;
  if (orgVisibilityMutation) {
    nextOrgVisibility = await validateTaskOrgVisibilityMutation(
      ctx,
      normalizeTaskOrgVisibilityState(
        input.visibilityScope ?? existing.visibilityScope,
        input.orgUnitId !== undefined ? input.orgUnitId : existing.orgUnitId,
      ),
      {
        mode: "edit",
        existing: {
          tenantId: existing.tenantId,
          createdByUserId: existing.createdByUserId,
          assigneeUserIds: existing.assigneeTemplates.map((a) => a.userId),
          visibilityScope: existing.visibilityScope,
          orgUnitId: existing.orgUnitId,
        },
      },
    );
    const scope = nextOrgVisibility?.visibilityScope ?? existing.visibilityScope;
    nextAccessGrants = await validateTaskAccessGrantMutation(ctx.tenantId, {
      visibilityScope: scope,
      orgUnitGrantIds:
        input.orgUnitGrantIds ??
        (input.orgUnitId !== undefined && input.orgUnitId
          ? [input.orgUnitId]
          : existing.orgUnitId
            ? [existing.orgUnitId]
            : undefined),
      viewerUserGrantIds: input.viewerUserGrantIds,
    });
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
        reminder1PresetKey:
          input.reminder1PresetKey !== undefined ? input.reminder1PresetKey : undefined,
        reminder2PresetKey:
          input.reminder2PresetKey !== undefined ? input.reminder2PresetKey : undefined,
        timezone: input.timezone,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        visibilityScope: nextOrgVisibility?.visibilityScope,
        ...(nextAccessGrants && nextOrgVisibility
          ? {
              orgUnit:
                nextOrgVisibility.visibilityScope === TaskVisibilityScope.ORG_UNIT &&
                nextAccessGrants.orgUnitIds[0]
                  ? { connect: { id: nextAccessGrants.orgUnitIds[0] } }
                  : { disconnect: true },
            }
          : nextOrgVisibility
            ? {
                orgUnit: nextOrgVisibility.orgUnitId
                  ? { connect: { id: nextOrgVisibility.orgUnitId } }
                  : { disconnect: true },
              }
            : {}),
      },
      include: SERIES_INCLUDE,
    });

    if (nextAccessGrants && nextOrgVisibility) {
      await replaceTaskSeriesAccessGrants(
        tx,
        ctx.tenantId,
        existing.id,
        updated.visibilityScope,
        nextAccessGrants,
      );
    }

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
      beforeJson: {
        title: existing.title,
        orgUnitId: existing.orgUnitId,
        visibilityScope: existing.visibilityScope,
      },
      afterJson: {
        title: updated.title,
        orgUnitId: updated.orgUnitId,
        visibilityScope: updated.visibilityScope,
      },
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

  const parentReminders = resolveTaskReminderSchedule({
    dueAt: parentDueAt,
    reminder1At: null,
    reminder2At: null,
    reminder1PresetKey: series.reminder1PresetKey,
    reminder2PresetKey: series.reminder2PresetKey,
    timeZone: series.timezone,
  });

  const occurrenceOrg = resolvePropagatedTaskOrgVisibility({
    visibilityScope: series.visibilityScope,
    orgUnitId: series.orgUnitId,
  });

  let parent: { id: string };
  try {
    parent = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        title: series.title,
        description: series.description,
        priority: series.priority,
        status: TaskStatusEnum.OPEN,
        dueAt: parentReminders.dueAt,
        reminder1At: parentReminders.reminder1At,
        reminder2At: parentReminders.reminder2At,
        reminder1PresetKey: parentReminders.reminder1PresetKey,
        reminder2PresetKey: parentReminders.reminder2PresetKey,
        taskSeriesId: series.id,
        seriesOccurrenceKey: occurrenceKey,
        orgUnitId: occurrenceOrg.orgUnitId,
        visibilityScope: occurrenceOrg.visibilityScope,
        createdByUserId: series.createdByUserId ?? ctx.userId,
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

  await snapshotSeriesAccessGrantsToOccurrence(
    tx,
    ctx.tenantId,
    series.id,
    parent.id,
    occurrenceOrg.visibilityScope,
  );

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

    const childReminders = resolveTaskReminderSchedule({
      dueAt: childDueAt,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: template.reminder1PresetKey,
      reminder2PresetKey: template.reminder2PresetKey,
      timeZone: series.timezone,
    });

    const child = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        parentTaskId: parent.id,
        title: template.title,
        description: template.description,
        priority: template.priority,
        status: TaskStatusEnum.OPEN,
        dueAt: childReminders.dueAt,
        reminder1At: childReminders.reminder1At,
        reminder2At: childReminders.reminder2At,
        reminder1PresetKey: childReminders.reminder1PresetKey,
        reminder2PresetKey: childReminders.reminder2PresetKey,
        orgUnitId: occurrenceOrg.orgUnitId,
        visibilityScope: occurrenceOrg.visibilityScope,
        createdByUserId: series.createdByUserId ?? ctx.userId,
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
