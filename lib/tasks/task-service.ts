/**
 * AUFGABEN-01 — canonical task service layer.
 *
 * tenantId and actor identity always come from trusted server context.
 */

import type { Prisma, TaskStatus } from "@prisma/client";
import { TaskStatus as TaskStatusEnum, TaskVisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateTaskContext } from "./context-validation";
import { normalizeTaskDescriptionInput } from "./task-description";
import {
  ParentHasOpenSubtasksError,
  TaskForbiddenError,
  TaskValidationError,
} from "./errors";
import { sortPersonalTasks } from "./personal-ordering";
import {
  assertNotSubtaskParent,
  computeSubtaskProgress,
  hasActionableSubtasks,
} from "./subtask-rules";
import type {
  CreateQuickTaskInput,
  CreateSubtaskInput,
  CreateTaskInput,
  ListTasksFilter,
  PersonalTaskDto,
  TaskDto,
  TaskProgressDto,
  TaskServiceContext,
  UpdateTaskInput,
} from "./types";
import { assertQuickCreateAssigneeAuthorization } from "./quick-create";
import {
  buildTaskVisibilityWhere,
  canManageTask,
  hasTaskPermission,
  loadAuthorizedParentTaskRefs,
} from "./visibility";
import { TASK_AUTH_INCLUDE, requireVisibleTask } from "./task-access";
import {
  computeNewAssigneeRows,
  emitTaskAssignmentNotifications,
  emitTaskDeadlineChangedNotifications,
} from "@/lib/notifications/task-producer";
import {
  normalizeTaskOrgVisibilityState,
  validateTaskOrgVisibilityMutation,
} from "./task-org-mutation-policy";
import {
  assertTaskOrgVisibilityPropagationEditable,
  resolvePropagatedTaskOrgVisibility,
  requestsTaskOrgVisibilityChange,
} from "./task-org-propagation";
import {
  recomputeRemindersForDueChange,
  resolveTaskReminderSchedule,
} from "./task-reminder-schedule";
import {
  replaceTaskAccessGrants,
  snapshotTaskAccessGrantsToChild,
  validateTaskAccessGrantMutation,
} from "./task-access-grants";

const TASK_INCLUDE = TASK_AUTH_INCLUDE;

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

function assertCanView(ctx: TaskServiceContext): void {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    throw new TaskForbiddenError("Missing tasks.view");
  }
}

function assertCanCreate(ctx: TaskServiceContext): void {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE)) {
    throw new TaskForbiddenError("Missing tasks.create");
  }
}

function assertCanAssign(ctx: TaskServiceContext): void {
  if (
    !hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) &&
    !hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  ) {
    throw new TaskForbiddenError("Missing tasks.assign");
  }
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new TaskValidationError("Title is required");
  if (trimmed.length > 500) {
    throw new TaskValidationError("Title must not exceed 500 characters");
  }
  return trimmed;
}

async function validateAssigneeUserIds(
  tenantId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const unique = [...new Set(userIds)];
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      userId: { in: unique },
      isActive: true,
    },
    select: { userId: true },
  });

  if (memberships.length !== unique.length) {
    throw new TaskValidationError(
      "One or more assignees are not active members of this tenant",
    );
  }
}

function applyStatusTransition(
  current: TaskStatus,
  next: TaskStatus,
): { status: TaskStatus; completedAt: Date | null } {
  if (current === next) {
    return {
      status: current,
      completedAt: current === TaskStatusEnum.DONE ? new Date() : null,
    };
  }

  const terminal = [TaskStatusEnum.DONE, TaskStatusEnum.CANCELLED] as TaskStatus[];
  if (terminal.includes(current) && next !== current) {
    throw new TaskValidationError("Cannot reopen a completed or cancelled task");
  }

  if (next === TaskStatusEnum.DONE) {
    return { status: next, completedAt: new Date() };
  }

  return { status: next, completedAt: null };
}

async function loadTenantTimeZone(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return tenant?.timezone ?? "Europe/Zurich";
}

function reminderFieldsRequested(input: {
  reminder1At?: Date | null;
  reminder2At?: Date | null;
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
}): boolean {
  return (
    input.reminder1At !== undefined ||
    input.reminder2At !== undefined ||
    input.reminder1PresetKey !== undefined ||
    input.reminder2PresetKey !== undefined
  );
}

async function resolveReminderScheduleForCreate(
  tenantId: string,
  input: {
    dueAt?: Date | null;
    reminder1At?: Date | null;
    reminder2At?: Date | null;
    reminder1PresetKey?: string | null;
    reminder2PresetKey?: string | null;
  },
) {
  const dueAt = input.dueAt ?? null;
  if (!reminderFieldsRequested(input)) {
    return {
      dueAt,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
    };
  }

  const timeZone = await loadTenantTimeZone(tenantId);
  return resolveTaskReminderSchedule({
    dueAt,
    reminder1At: input.reminder1At ?? null,
    reminder2At: input.reminder2At ?? null,
    reminder1PresetKey: input.reminder1PresetKey ?? null,
    reminder2PresetKey: input.reminder2PresetKey ?? null,
    timeZone,
  });
}

async function resolveReminderScheduleForUpdate(
  tenantId: string,
  existing: TaskRow,
  input: UpdateTaskInput,
) {
  if (!reminderFieldsRequested(input) && input.dueAt === undefined) {
    return null;
  }

  const timeZone = await loadTenantTimeZone(tenantId);
  const nextDueAt = input.dueAt !== undefined ? input.dueAt : existing.dueAt;

  const nextPreset1 =
    input.reminder1PresetKey !== undefined
      ? input.reminder1PresetKey
      : existing.reminder1PresetKey;
  const nextPreset2 =
    input.reminder2PresetKey !== undefined
      ? input.reminder2PresetKey
      : existing.reminder2PresetKey;

  const nextR1 =
    input.reminder1At !== undefined ? input.reminder1At : existing.reminder1At;
  const nextR2 =
    input.reminder2At !== undefined ? input.reminder2At : existing.reminder2At;

  if (input.dueAt !== undefined && input.dueAt?.getTime() !== existing.dueAt?.getTime()) {
    return recomputeRemindersForDueChange({
      dueAt: nextDueAt,
      reminder1At: nextR1,
      reminder2At: nextR2,
      reminder1PresetKey: nextPreset1,
      reminder2PresetKey: nextPreset2,
      timeZone,
    });
  }

  if (reminderFieldsRequested(input) || input.dueAt !== undefined) {
    return resolveTaskReminderSchedule({
      dueAt: nextDueAt,
      reminder1At: nextPreset1 ? null : nextR1,
      reminder2At: nextPreset2 ? null : nextR2,
      reminder1PresetKey: nextPreset1,
      reminder2PresetKey: nextPreset2,
      timeZone,
    });
  }

  return null;
}

async function recordTaskAudit(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    actorUserId: string;
    taskId: string;
    action: string;
    beforeJson?: unknown;
    afterJson?: unknown;
  },
) {
  await writeAuditRecord(tx, {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    moduleKey: "tasks",
    entityType: "Task",
    entityId: input.taskId,
    action: input.action,
    beforeJson: input.beforeJson,
    afterJson: input.afterJson,
  });
}

export async function createTask(
  ctx: TaskServiceContext,
  input: CreateTaskInput,
): Promise<TaskDto> {
  assertCanCreate(ctx);

  const title = normalizeTitle(input.title);
  await validateTaskContext(ctx, input.contextType, input.contextId);

  const assigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
  await validateAssigneeUserIds(ctx.tenantId, assigneeUserIds);

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

  const reminderSchedule = await resolveReminderScheduleForCreate(ctx.tenantId, input);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        title,
        description: normalizeTaskDescriptionInput(input.description),
        priority: input.priority ?? "NORMAL",
        dueAt: reminderSchedule.dueAt,
        reminder1At: reminderSchedule.reminder1At,
        reminder2At: reminderSchedule.reminder2At,
        reminder1PresetKey: reminderSchedule.reminder1PresetKey,
        reminder2PresetKey: reminderSchedule.reminder2PresetKey,
        contextType: input.contextType ?? null,
        contextId: input.contextId ?? null,
        orgUnitId: primaryOrgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
        createdByUserId: ctx.userId,
        status: TaskStatusEnum.OPEN,
      },
      include: TASK_INCLUDE,
    });

    await replaceTaskAccessGrants(
      tx,
      ctx.tenantId,
      created.id,
      orgVisibility.visibilityScope,
      accessGrants,
    );

    if (assigneeUserIds.length > 0) {
      assertCanAssign(ctx);
      await tx.taskAssignee.createMany({
        data: assigneeUserIds.map((userId) => ({
          tenantId: ctx.tenantId,
          taskId: created.id,
          userId,
          assignedByUserId: ctx.userId,
        })),
      });
    }

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: created.id,
      action: "TASK_CREATED",
      afterJson: {
        title,
        status: created.status,
        assigneeUserIds,
        orgUnitId: primaryOrgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
        accessGrants,
      },
    });

    if (assigneeUserIds.length > 0) {
      await recordTaskAudit(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        taskId: created.id,
        action: "TASK_ASSIGNED",
        afterJson: { assigneeUserIds },
      });
    }

    const finalRow = await tx.task.findFirstOrThrow({
      where: { id: created.id, tenantId: ctx.tenantId },
      include: TASK_INCLUDE,
    });

    const assignedAt = new Date();
    await emitTaskAssignmentNotifications(tx, {
      tenantId: ctx.tenantId,
      taskId: finalRow.id,
      taskTitle: finalRow.title,
      isSubtask: false,
      assigneeRows: computeNewAssigneeRows([], assigneeUserIds, assignedAt),
      context: { actorUserId: ctx.userId },
      dueAt: finalRow.dueAt,
    });

    return finalRow;
  });

  return mapTask(task);
}

/**
 * AUFGABEN-06P — Meine Aufgaben quick create.
 * Organisation-wide (CLUB) by default; no org unit, no context. Self-only needs
 * tasks.view; other assignees require tasks.create + tasks.assign (or manage).
 */
async function resolveQuickCreateOrgVisibility(
  ctx: TaskServiceContext,
  selfOnly: boolean,
): Promise<{ visibilityScope: TaskVisibilityScope; orgUnitId: string | null }> {
  if (selfOnly && !hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE)) {
    return {
      visibilityScope: TaskVisibilityScope.CLUB,
      orgUnitId: null,
    };
  }

  return validateTaskOrgVisibilityMutation(
    ctx,
    normalizeTaskOrgVisibilityState(undefined, null),
    { mode: "create" },
  );
}

export async function createQuickTask(
  ctx: TaskServiceContext,
  input: CreateQuickTaskInput,
): Promise<TaskDto> {
  const title = normalizeTitle(input.title);
  const assigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];

  assertQuickCreateAssigneeAuthorization(ctx, assigneeUserIds);
  await validateAssigneeUserIds(ctx.tenantId, assigneeUserIds);

  const reminderSchedule = await resolveReminderScheduleForCreate(ctx.tenantId, input);

  const selfOnly =
    assigneeUserIds.length === 1 && assigneeUserIds[0] === ctx.userId;

  const orgVisibility = await resolveQuickCreateOrgVisibility(ctx, selfOnly);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        title,
        description: normalizeTaskDescriptionInput(input.description),
        priority: input.priority ?? "NORMAL",
        dueAt: reminderSchedule.dueAt,
        reminder1At: reminderSchedule.reminder1At,
        reminder2At: reminderSchedule.reminder2At,
        reminder1PresetKey: reminderSchedule.reminder1PresetKey,
        reminder2PresetKey: reminderSchedule.reminder2PresetKey,
        contextType: null,
        contextId: null,
        orgUnitId: orgVisibility.orgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
        createdByUserId: ctx.userId,
        status: TaskStatusEnum.OPEN,
      },
      include: TASK_INCLUDE,
    });

    if (assigneeUserIds.length > 0) {
      if (!selfOnly) {
        assertCanAssign(ctx);
      }
      await tx.taskAssignee.createMany({
        data: assigneeUserIds.map((userId) => ({
          tenantId: ctx.tenantId,
          taskId: created.id,
          userId,
          assignedByUserId: ctx.userId,
        })),
      });
    }

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: created.id,
      action: "TASK_CREATED",
      afterJson: {
        title,
        status: created.status,
        assigneeUserIds,
        orgUnitId: orgVisibility.orgUnitId,
        visibilityScope: orgVisibility.visibilityScope,
      },
    });

    if (assigneeUserIds.length > 0) {
      await recordTaskAudit(tx, {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        taskId: created.id,
        action: "TASK_ASSIGNED",
        afterJson: { assigneeUserIds },
      });
    }

    const finalRow = await tx.task.findFirstOrThrow({
      where: { id: created.id, tenantId: ctx.tenantId },
      include: TASK_INCLUDE,
    });

    const assignedAt = new Date();
    await emitTaskAssignmentNotifications(tx, {
      tenantId: ctx.tenantId,
      taskId: finalRow.id,
      taskTitle: finalRow.title,
      isSubtask: false,
      assigneeRows: computeNewAssigneeRows([], assigneeUserIds, assignedAt),
      context: { actorUserId: ctx.userId },
      dueAt: finalRow.dueAt,
    });

    return finalRow;
  });

  return mapTask(task);
}

export async function getTask(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDto> {
  const task = await requireVisibleTask(ctx, taskId);
  return mapTask(task);
}

function buildListWhere(
  ctx: TaskServiceContext,
  filter?: ListTasksFilter,
): Prisma.TaskWhereInput {
  const base = buildTaskVisibilityWhere(ctx);
  const and: Prisma.TaskWhereInput[] = [base];

  if (filter?.rootsOnly) {
    and.push({ parentTaskId: null });
  }

  if (filter?.openOnly) {
    and.push({
      status: { in: [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS] },
    });
  } else if (filter?.status) {
    const statuses = Array.isArray(filter.status)
      ? filter.status
      : [filter.status];
    and.push({ status: { in: statuses } });
  }

  return and.length === 1 ? base : { AND: and };
}

export async function listTasks(
  ctx: TaskServiceContext,
  filter?: ListTasksFilter,
): Promise<TaskDto[]> {
  assertCanView(ctx);

  const rows = await prisma.task.findMany({
    where: buildListWhere(ctx, filter),
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  return rows.map(mapTask);
}

export async function listMyTasks(
  ctx: TaskServiceContext,
  filter?: ListTasksFilter,
): Promise<PersonalTaskDto[]> {
  assertCanView(ctx);

  const statusFilter: Prisma.TaskWhereInput = filter?.openOnly
    ? { status: { in: [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS] } }
    : filter?.status
      ? {
          status: {
            in: Array.isArray(filter.status) ? filter.status : [filter.status],
          },
        }
      : {};

  const rows = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } },
      ...statusFilter,
    },
    include: TASK_INCLUDE,
  });

  const parentIds = [
    ...new Set(
      rows.map((r) => r.parentTaskId).filter((id): id is string => Boolean(id)),
    ),
  ];

  const parentById =
    parentIds.length > 0
      ? await loadAuthorizedParentTaskRefs(ctx, parentIds)
      : new Map<string, { id: string; title: string }>();

  const personal = rows.map((row) => {
    const dto = mapTask(row);
    const parent = row.parentTaskId ? parentById.get(row.parentTaskId) : null;
    return {
      ...dto,
      parentTask: parent ? { id: parent.id, title: parent.title } : null,
    };
  });

  const ordered = sortPersonalTasks(personal);
  if (filter?.limit != null && filter.limit > 0) {
    return ordered.slice(0, filter.limit);
  }
  return ordered;
}

export async function createSubtask(
  ctx: TaskServiceContext,
  parentTaskId: string,
  input: CreateSubtaskInput,
): Promise<TaskDto> {
  assertCanCreate(ctx);

  const parent = await requireVisibleTask(ctx, parentTaskId);
  assertNotSubtaskParent(parent);

  const title = normalizeTitle(input.title);
  const assigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
  await validateAssigneeUserIds(ctx.tenantId, assigneeUserIds);

  const propagatedOrg = resolvePropagatedTaskOrgVisibility({
    visibilityScope: parent.visibilityScope,
    orgUnitId: parent.orgUnitId,
  });

  const reminderSchedule = await resolveReminderScheduleForCreate(ctx.tenantId, input);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        parentTaskId: parent.id,
        title,
        description: normalizeTaskDescriptionInput(input.description),
        priority: input.priority ?? "NORMAL",
        dueAt: reminderSchedule.dueAt,
        reminder1At: reminderSchedule.reminder1At,
        reminder2At: reminderSchedule.reminder2At,
        reminder1PresetKey: reminderSchedule.reminder1PresetKey,
        reminder2PresetKey: reminderSchedule.reminder2PresetKey,
        orgUnitId: propagatedOrg.orgUnitId,
        visibilityScope: propagatedOrg.visibilityScope,
        contextType: parent.contextType,
        contextId: parent.contextId,
        createdByUserId: ctx.userId,
        status: TaskStatusEnum.OPEN,
      },
      include: TASK_INCLUDE,
    });

    await snapshotTaskAccessGrantsToChild(
      tx,
      ctx.tenantId,
      parent.id,
      created.id,
      propagatedOrg.visibilityScope,
    );

    if (assigneeUserIds.length > 0) {
      assertCanAssign(ctx);
      await tx.taskAssignee.createMany({
        data: assigneeUserIds.map((userId) => ({
          tenantId: ctx.tenantId,
          taskId: created.id,
          userId,
          assignedByUserId: ctx.userId,
        })),
      });
    }

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: created.id,
      action: "TASK_CREATED",
      afterJson: {
        title,
        parentTaskId: parent.id,
        assigneeUserIds,
        isSubtask: true,
        contextType: parent.contextType,
        contextId: parent.contextId,
      },
    });

    const finalRow = await tx.task.findFirstOrThrow({
      where: { id: created.id, tenantId: ctx.tenantId },
      include: TASK_INCLUDE,
    });

    const assignedAt = new Date();
    await emitTaskAssignmentNotifications(tx, {
      tenantId: ctx.tenantId,
      taskId: finalRow.id,
      taskTitle: finalRow.title,
      isSubtask: true,
      assigneeRows: computeNewAssigneeRows([], assigneeUserIds, assignedAt),
      context: { actorUserId: ctx.userId },
      dueAt: finalRow.dueAt,
    });

    return finalRow;
  });

  return mapTask(task);
}

export async function listSubtasks(
  ctx: TaskServiceContext,
  parentTaskId: string,
): Promise<TaskDto[]> {
  await requireVisibleTask(ctx, parentTaskId);

  const rows = await prisma.task.findMany({
    where: {
      AND: [buildTaskVisibilityWhere(ctx), { parentTaskId }],
    },
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  return rows.map(mapTask);
}

export async function getTaskProgress(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskProgressDto> {
  await requireVisibleTask(ctx, taskId);

  const children = await prisma.task.findMany({
    where: {
      AND: [buildTaskVisibilityWhere(ctx), { parentTaskId: taskId }],
    },
    select: { status: true },
  });

  const progress = computeSubtaskProgress(children);
  return {
    ...progress,
    percent: progress.totalCount === 0 ? 0 : progress.percent,
  };
}

export async function updateTask(
  ctx: TaskServiceContext,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskDto> {
  const existing = await requireVisibleTask(ctx, taskId);

  const isAssignee = existing.assignees.some((a) => a.userId === ctx.userId);
  const isCreator = existing.createdByUserId === ctx.userId;
  const canManage = canManageTask(ctx, {
    tenantId: existing.tenantId,
    createdByUserId: existing.createdByUserId,
    assigneeUserIds: existing.assignees.map((a) => a.userId),
    visibilityScope: existing.visibilityScope,
    orgUnitId: existing.orgUnitId,
  });

  const orgVisibilityMutation = requestsTaskOrgVisibilityChange(
    {
      visibilityScope: existing.visibilityScope,
      orgUnitId: existing.orgUnitId,
    },
    input,
  );

  if (!canManage && !(isCreator && hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE))) {
    if (!isAssignee || input.status === undefined) {
      throw new TaskForbiddenError();
    }
    if (
      input.title !== undefined ||
      input.description !== undefined ||
      input.priority !== undefined ||
      input.dueAt !== undefined ||
      reminderFieldsRequested(input) ||
      input.contextType !== undefined ||
      input.contextId !== undefined ||
      orgVisibilityMutation
    ) {
      throw new TaskForbiddenError("Assignees may only update status");
    }
  } else if (!canManage) {
    assertCanCreate(ctx);
  }

  let nextOrgVisibility:
    | Awaited<ReturnType<typeof validateTaskOrgVisibilityMutation>>
    | null = null;
  const accessGrantMutation =
    input.orgUnitGrantIds !== undefined ||
    input.viewerUserGrantIds !== undefined ||
    orgVisibilityMutation;
  let nextAccessGrants: Awaited<ReturnType<typeof validateTaskAccessGrantMutation>> | null =
    null;
  if (orgVisibilityMutation) {
    assertTaskOrgVisibilityPropagationEditable({
      parentTaskId: existing.parentTaskId,
      taskSeriesId: existing.taskSeriesId,
    });
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
          assigneeUserIds: existing.assignees.map((a) => a.userId),
          visibilityScope: existing.visibilityScope,
          orgUnitId: existing.orgUnitId,
          orgUnitTenantId: existing.orgUnit?.tenantId ?? null,
        },
      },
    );
  }

  if (accessGrantMutation) {
    const scope =
      nextOrgVisibility?.visibilityScope ?? existing.visibilityScope;
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

  const data: Prisma.TaskUpdateInput = {};
  if (input.title !== undefined) data.title = normalizeTitle(input.title);
  if (input.description !== undefined) {
    data.description = normalizeTaskDescriptionInput(input.description);
  }
  if (input.priority !== undefined) data.priority = input.priority;
  const reminderSchedule = await resolveReminderScheduleForUpdate(ctx.tenantId, existing, input);
  if (reminderSchedule) {
    data.dueAt = reminderSchedule.dueAt;
    data.reminder1At = reminderSchedule.reminder1At;
    data.reminder2At = reminderSchedule.reminder2At;
    data.reminder1PresetKey = reminderSchedule.reminder1PresetKey;
    data.reminder2PresetKey = reminderSchedule.reminder2PresetKey;
  } else if (input.dueAt !== undefined) {
    data.dueAt = input.dueAt;
  }

  const contextMutation =
    input.contextType !== undefined || input.contextId !== undefined;
  if (contextMutation) {
    if (
      !canManage &&
      !(isCreator && hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE))
    ) {
      throw new TaskForbiddenError();
    }
    const nextType =
      input.contextType !== undefined ? input.contextType : existing.contextType;
    const nextId =
      input.contextId !== undefined
        ? input.contextId
        : existing.contextId;
    await validateTaskContext(ctx, nextType, nextId);
    if (input.contextType !== undefined) data.contextType = input.contextType;
    if (input.contextId !== undefined) data.contextId = input.contextId;
  }

  if (input.status !== undefined) {
    const transition = applyStatusTransition(existing.status, input.status);
    data.status = transition.status;
    data.completedAt = transition.completedAt;
  }

  if (nextOrgVisibility) {
    data.visibilityScope = nextOrgVisibility.visibilityScope;
  }
  if (nextAccessGrants) {
    if (nextOrgVisibility?.visibilityScope === TaskVisibilityScope.ORG_UNIT) {
      const primary = nextAccessGrants.orgUnitIds[0] ?? null;
      data.orgUnit = primary ? { connect: { id: primary } } : { disconnect: true };
    } else if (nextOrgVisibility) {
      data.orgUnit = { disconnect: true };
    }
  } else if (nextOrgVisibility) {
    data.orgUnit = nextOrgVisibility.orgUnitId
      ? { connect: { id: nextOrgVisibility.orgUnitId } }
      : { disconnect: true };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id: existing.id },
      data,
      include: TASK_INCLUDE,
    });

    if (nextAccessGrants) {
      await replaceTaskAccessGrants(
        tx,
        ctx.tenantId,
        row.id,
        row.visibilityScope,
        nextAccessGrants,
      );
    }

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: row.id,
      action: "TASK_UPDATED",
      beforeJson: {
        title: existing.title,
        status: existing.status,
        priority: existing.priority,
        dueAt: existing.dueAt?.toISOString() ?? null,
        reminder1At: existing.reminder1At?.toISOString() ?? null,
        reminder2At: existing.reminder2At?.toISOString() ?? null,
        reminder1PresetKey: existing.reminder1PresetKey,
        reminder2PresetKey: existing.reminder2PresetKey,
        contextType: existing.contextType,
        contextId: existing.contextId,
        orgUnitId: existing.orgUnitId,
        visibilityScope: existing.visibilityScope,
      },
      afterJson: {
        title: row.title,
        status: row.status,
        priority: row.priority,
        dueAt: row.dueAt?.toISOString() ?? null,
        reminder1At: row.reminder1At?.toISOString() ?? null,
        reminder2At: row.reminder2At?.toISOString() ?? null,
        reminder1PresetKey: row.reminder1PresetKey,
        reminder2PresetKey: row.reminder2PresetKey,
        contextType: row.contextType,
        contextId: row.contextId,
        orgUnitId: row.orgUnitId,
        visibilityScope: row.visibilityScope,
      },
    });

    if (input.dueAt !== undefined) {
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { locale: true, timezone: true },
      });
      await emitTaskDeadlineChangedNotifications(tx, {
        tenantId: ctx.tenantId,
        taskId: row.id,
        taskTitle: row.title,
        assigneeUserIds: row.assignees.map((a) => a.userId),
        actorUserId: ctx.userId,
        previousDueAt: existing.dueAt,
        nextDueAt: row.dueAt,
        changedAt: new Date(),
        locale: tenant?.locale ?? "de-CH",
        timeZone: tenant?.timezone ?? "Europe/Zurich",
      });
    }

    return row;
  });

  return mapTask(updated);
}

export async function assignTask(
  ctx: TaskServiceContext,
  taskId: string,
  assigneeUserIds: string[],
): Promise<TaskDto> {
  assertCanAssign(ctx);
  const existing = await requireVisibleTask(ctx, taskId);

  const unique = [...new Set(assigneeUserIds)];
  await validateAssigneeUserIds(ctx.tenantId, unique);
  const previousUserIds = existing.assignees.map((a) => a.userId);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.deleteMany({
      where: { taskId: existing.id, tenantId: ctx.tenantId },
    });

    const assignedAt = new Date();
    if (unique.length > 0) {
      await tx.taskAssignee.createMany({
        data: unique.map((userId) => ({
          tenantId: ctx.tenantId,
          taskId: existing.id,
          userId,
          assignedByUserId: ctx.userId,
          assignedAt,
        })),
      });
    }

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: existing.id,
      action: "TASK_ASSIGNED",
      beforeJson: { assigneeUserIds: previousUserIds },
      afterJson: { assigneeUserIds: unique },
    });

    const row = await tx.task.findFirstOrThrow({
      where: { id: existing.id, tenantId: ctx.tenantId },
      include: TASK_INCLUDE,
    });

    await emitTaskAssignmentNotifications(tx, {
      tenantId: ctx.tenantId,
      taskId: row.id,
      taskTitle: row.title,
      isSubtask: Boolean(row.parentTaskId),
      assigneeRows: computeNewAssigneeRows(previousUserIds, unique, assignedAt),
      context: { actorUserId: ctx.userId },
      dueAt: row.dueAt,
    });

    return row;
  });

  return mapTask(updated);
}

export async function completeTask(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDto> {
  const existing = await requireVisibleTask(ctx, taskId);
  const isAssignee = existing.assignees.some((a) => a.userId === ctx.userId);
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  if (!canManage && !isAssignee) {
    throw new TaskForbiddenError("Only assignees or managers can complete tasks");
  }

  if (!existing.parentTaskId) {
    // Opaque completion guard: block while any tenant child remains actionable,
    // including children the actor cannot read (no disclosure via query filters).
    const children = await prisma.task.findMany({
      where: {
        tenantId: ctx.tenantId,
        parentTaskId: existing.id,
      },
      select: { status: true },
    });
    if (hasActionableSubtasks(children)) {
      throw new ParentHasOpenSubtasksError();
    }
  }

  const transition = applyStatusTransition(existing.status, TaskStatusEnum.DONE);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id: existing.id },
      data: {
        status: transition.status,
        completedAt: transition.completedAt,
      },
      include: TASK_INCLUDE,
    });

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: row.id,
      action: "TASK_COMPLETED",
      beforeJson: { status: existing.status },
      afterJson: { status: row.status, completedAt: row.completedAt },
    });

    return row;
  });

  return mapTask(updated);
}

export async function cancelTask(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<TaskDto> {
  const existing = await requireVisibleTask(ctx, taskId);
  const isCreator = existing.createdByUserId === ctx.userId;
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  if (!canManage && !isCreator) {
    throw new TaskForbiddenError("Only creator or managers can cancel tasks");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id: existing.id },
      data: { status: TaskStatusEnum.CANCELLED, completedAt: null },
      include: TASK_INCLUDE,
    });

    await recordTaskAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      taskId: row.id,
      action: "TASK_CANCELLED",
      beforeJson: { status: existing.status },
      afterJson: { status: row.status },
    });

    return row;
  });

  return mapTask(updated);
}

export async function countMyOpenTasks(ctx: TaskServiceContext): Promise<number> {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    return 0;
  }

  return prisma.task.count({
    where: {
      tenantId: ctx.tenantId,
      assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } },
      status: { in: [TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS] },
    },
  });
}

export async function resolvePersonalTasksAvailability(
  ctx: TaskServiceContext,
): Promise<{ available: boolean; count: number | null }> {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    return { available: false, count: null };
  }

  const count = await countMyOpenTasks(ctx);
  return { available: true, count };
}
