import { TaskStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType as NotificationTypeEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isActiveTaskStatus } from "@/lib/tasks/management-deadline";
import { taskHasExplicitReminders } from "@/lib/tasks/task-reminder-schedule";
import {
  TASK_DUE_SOON_LEAD_MS,
  TASK_DEADLINE_TASK_BATCH_SIZE,
  TASK_DEADLINE_TENANT_BATCH_SIZE,
} from "./constants";
import {
  buildTaskDueSoonDedupKey,
  buildTaskOverdueDedupKey,
  buildTaskReminderDedupKey,
  taskWorkspaceHref,
} from "./deduplication";
import { createNotificationIdempotent } from "./notification-service";
import { loadEffectivePreferencesForUsers } from "./preference-service";
import {
  buildTaskDueSoonCopy,
  buildTaskOverdueCopy,
  buildTaskReminderCopy,
  formatTaskDueLabel,
} from "./task-copy";

export type ProcessTaskDeadlineNotificationsResult = {
  dueSoonCreated: number;
  overdueCreated: number;
  reminderCreated: number;
  tenantsProcessed: number;
};

const TASK_DEADLINE_BATCH_SIZE = TASK_DEADLINE_TASK_BATCH_SIZE;

const MS_PER_HOUR = 60 * 60 * 1000;

export function selectDeadlineProcessingPageIndex(
  now: Date,
  pageCount: number,
): number {
  if (pageCount <= 1) return 0;
  return Math.floor(now.getTime() / MS_PER_HOUR) % pageCount;
}

export async function selectTenantIdsForDeadlineBatch(
  now: Date = new Date(),
): Promise<string[]> {
  const rows = await prisma.task.findMany({
    where: {
      OR: [
        { dueAt: { not: null } },
        { reminder1At: { not: null } },
        { reminder2At: { not: null } },
      ],
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    distinct: ["tenantId"],
    orderBy: { tenantId: "asc" },
    select: { tenantId: true },
  });

  if (rows.length === 0) return [];

  const pageCount = Math.ceil(rows.length / TASK_DEADLINE_TENANT_BATCH_SIZE);
  const pageIndex = selectDeadlineProcessingPageIndex(now, pageCount);
  const start = pageIndex * TASK_DEADLINE_TENANT_BATCH_SIZE;
  return rows.slice(start, start + TASK_DEADLINE_TENANT_BATCH_SIZE).map((row) => row.tenantId);
}

async function fetchTaskBatchForDeadlineProcessing(
  where: Prisma.TaskWhereInput,
  now: Date,
) {
  const total = await prisma.task.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / TASK_DEADLINE_BATCH_SIZE));
  const pageIndex = selectDeadlineProcessingPageIndex(now, pageCount);

  return prisma.task.findMany({
    where,
    include: { assignees: true },
    orderBy: { id: "asc" },
    skip: pageIndex * TASK_DEADLINE_BATCH_SIZE,
    take: TASK_DEADLINE_BATCH_SIZE,
  });
}

type ReminderStage = 1 | 2;

async function emitReminderNotificationsForTask(input: {
  tenantId: string;
  task: {
    id: string;
    title: string;
    dueAt: Date | null;
    assignees: { userId: string }[];
  };
  stage: ReminderStage;
  reminderAt: Date;
  locale: string;
  timeZone: string;
}): Promise<number> {
  if (!input.task.dueAt) return 0;

  const dueLabel = formatTaskDueLabel(input.task.dueAt, input.locale, input.timeZone)!;
  const copy = buildTaskReminderCopy(input.task.title, dueLabel, input.stage);
  const href = taskWorkspaceHref(input.task.id);
  const reminderAtIso = input.reminderAt.toISOString();

  const userIds = input.task.assignees.map((a) => a.userId);
  const preferences = await loadEffectivePreferencesForUsers(
    prisma,
    input.tenantId,
    userIds,
    NotificationTypeEnum.TASK_REMINDER,
  );

  let created = 0;
  for (const assignee of input.task.assignees) {
    const pref = preferences.get(assignee.userId)!;
    const result = await prisma.$transaction(async (tx) =>
      createNotificationIdempotent(tx, {
        tenantId: input.tenantId,
        recipientUserId: assignee.userId,
        type: NotificationTypeEnum.TASK_REMINDER,
        title: copy.title,
        body: copy.body,
        href,
        entityType: NotificationEntityType.TASK,
        entityId: input.task.id,
        deduplicationKey: buildTaskReminderDedupKey({
          taskId: input.task.id,
          recipientUserId: assignee.userId,
          stage: input.stage,
          reminderAtIso,
        }),
        preferences: pref,
      }),
    );
    if (result?.kind === "CREATED") created += 1;
  }
  return created;
}

export async function processTaskDeadlineNotifications(
  now: Date = new Date(),
): Promise<ProcessTaskDeadlineNotificationsResult> {
  const dueSoonUpper = new Date(now.getTime() + TASK_DUE_SOON_LEAD_MS);

  const tenantIds = await selectTenantIdsForDeadlineBatch(now);

  let dueSoonCreated = 0;
  let overdueCreated = 0;
  let reminderCreated = 0;

  for (const tenantId of tenantIds) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { locale: true, timezone: true },
    });
    const locale = tenant?.locale ?? "de-CH";
    const timeZone = tenant?.timezone ?? "Europe/Zurich";

    const reminder1Candidates = await fetchTaskBatchForDeadlineProcessing(
      {
        tenantId,
        reminder1At: { not: null, lte: now },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      now,
    );

    for (const task of reminder1Candidates) {
      if (!task.reminder1At || !isActiveTaskStatus(task.status)) continue;
      reminderCreated += await emitReminderNotificationsForTask({
        tenantId,
        task: {
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          assignees: task.assignees,
        },
        stage: 1,
        reminderAt: task.reminder1At,
        locale,
        timeZone,
      });
    }

    const reminder2Candidates = await fetchTaskBatchForDeadlineProcessing(
      {
        tenantId,
        reminder2At: { not: null, lte: now },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      now,
    );

    for (const task of reminder2Candidates) {
      if (!task.reminder2At || !isActiveTaskStatus(task.status)) continue;
      reminderCreated += await emitReminderNotificationsForTask({
        tenantId,
        task: {
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          assignees: task.assignees,
        },
        stage: 2,
        reminderAt: task.reminder2At,
        locale,
        timeZone,
      });
    }

    const dueSoonCandidates = await fetchTaskBatchForDeadlineProcessing(
      {
        tenantId,
        dueAt: { gt: now, lte: dueSoonUpper },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      now,
    );

    for (const task of dueSoonCandidates) {
      if (!task.dueAt || !isActiveTaskStatus(task.status)) continue;
      if (
        taskHasExplicitReminders({
          reminder1At: task.reminder1At,
          reminder2At: task.reminder2At,
        })
      ) {
        continue;
      }

      const dueLabel = formatTaskDueLabel(task.dueAt, locale, timeZone)!;
      const copy = buildTaskDueSoonCopy(task.title, dueLabel);
      const href = taskWorkspaceHref(task.id);
      const dueAtIso = task.dueAt.toISOString();

      const userIds = task.assignees.map((a) => a.userId);
      const preferences = await loadEffectivePreferencesForUsers(
        prisma,
        tenantId,
        userIds,
        NotificationTypeEnum.TASK_DUE_SOON,
      );

      for (const assignee of task.assignees) {
        const pref = preferences.get(assignee.userId)!;
        const result = await prisma.$transaction(async (tx) =>
          createNotificationIdempotent(tx, {
            tenantId,
            recipientUserId: assignee.userId,
            type: NotificationTypeEnum.TASK_DUE_SOON,
            title: copy.title,
            body: copy.body,
            href,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            deduplicationKey: buildTaskDueSoonDedupKey({
              taskId: task.id,
              recipientUserId: assignee.userId,
              dueAtIso,
            }),
            preferences: pref,
          }),
        );
        if (result?.kind === "CREATED") dueSoonCreated += 1;
      }
    }

    const overdueCandidates = await fetchTaskBatchForDeadlineProcessing(
      {
        tenantId,
        dueAt: { lte: now },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      now,
    );

    for (const task of overdueCandidates) {
      if (!task.dueAt || !isActiveTaskStatus(task.status)) continue;
      const dueLabel = formatTaskDueLabel(task.dueAt, locale, timeZone)!;
      const copy = buildTaskOverdueCopy(task.title, dueLabel);
      const href = taskWorkspaceHref(task.id);
      const dueAtIso = task.dueAt.toISOString();

      const userIds = task.assignees.map((a) => a.userId);
      const preferences = await loadEffectivePreferencesForUsers(
        prisma,
        tenantId,
        userIds,
        NotificationTypeEnum.TASK_OVERDUE,
      );

      for (const assignee of task.assignees) {
        const pref = preferences.get(assignee.userId)!;
        const result = await prisma.$transaction(async (tx) =>
          createNotificationIdempotent(tx, {
            tenantId,
            recipientUserId: assignee.userId,
            type: NotificationTypeEnum.TASK_OVERDUE,
            title: copy.title,
            body: copy.body,
            href,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            deduplicationKey: buildTaskOverdueDedupKey({
              taskId: task.id,
              recipientUserId: assignee.userId,
              dueAtIso,
            }),
            preferences: pref,
          }),
        );
        if (result?.kind === "CREATED") overdueCreated += 1;
      }
    }
  }

  return {
    dueSoonCreated,
    overdueCreated,
    reminderCreated,
    tenantsProcessed: tenantIds.length,
  };
}
