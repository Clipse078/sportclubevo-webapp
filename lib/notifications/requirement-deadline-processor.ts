import type { Prisma } from "@prisma/client";
import {
  NotificationEntityType,
  NotificationType as NotificationTypeEnum,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  REQUIREMENT_DEADLINE_RECIPIENT_BATCH_SIZE,
  REQUIREMENT_DEADLINE_TENANT_BATCH_SIZE,
  TASK_DUE_SOON_LEAD_MS,
} from "./constants";
import {
  buildRequirementOverdueDedupKey,
  buildRequirementReminderDedupKey,
  requirementPersonalInboxHref,
} from "./deduplication";
import { selectDeadlineProcessingPageIndex } from "./deadline-processor";
import { createNotificationIdempotent } from "./notification-service";
import { loadEffectivePreferencesForUsers } from "./preference-service";
import {
  buildRequirementOverdueCopy,
  buildRequirementReminderCopy,
} from "./requirement-copy";
import {
  isGuardianNotificationRecipient,
  loadSubjectPersonNotificationContexts,
  resolveNotificationUserIdsForSubject,
} from "./requirement-recipient-resolution";
import { formatTaskDueLabel } from "./task-copy";

export type ProcessRequirementDeadlineNotificationsResult = {
  reminderCreated: number;
  overdueCreated: number;
  tenantsProcessed: number;
};

export async function selectTenantIdsForRequirementDeadlineBatch(
  now: Date = new Date(),
): Promise<string[]> {
  const rows = await prisma.requirementRecipient.findMany({
    where: {
      removedAt: null,
      resolutionStatus: "OPEN",
      requirement: {
        status: "ACTIVE",
        dueAt: { not: null },
      },
    },
    distinct: ["tenantId"],
    orderBy: { tenantId: "asc" },
    select: { tenantId: true },
  });

  if (rows.length === 0) return [];

  const pageCount = Math.ceil(rows.length / REQUIREMENT_DEADLINE_TENANT_BATCH_SIZE);
  const pageIndex = selectDeadlineProcessingPageIndex(now, pageCount);
  const start = pageIndex * REQUIREMENT_DEADLINE_TENANT_BATCH_SIZE;
  return rows.slice(start, start + REQUIREMENT_DEADLINE_TENANT_BATCH_SIZE).map((r) => r.tenantId);
}

async function fetchRecipientBatch(
  where: Prisma.RequirementRecipientWhereInput,
  now: Date,
) {
  const total = await prisma.requirementRecipient.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / REQUIREMENT_DEADLINE_RECIPIENT_BATCH_SIZE));
  const pageIndex = selectDeadlineProcessingPageIndex(now, pageCount);

  return prisma.requirementRecipient.findMany({
    where,
    include: {
      requirement: {
        select: { id: true, title: true, status: true, dueAt: true },
      },
    },
    orderBy: { id: "asc" },
    skip: pageIndex * REQUIREMENT_DEADLINE_RECIPIENT_BATCH_SIZE,
    take: REQUIREMENT_DEADLINE_RECIPIENT_BATCH_SIZE,
  });
}

export async function processRequirementDeadlineNotifications(
  now: Date = new Date(),
): Promise<ProcessRequirementDeadlineNotificationsResult> {
  const tenantIds = await selectTenantIdsForRequirementDeadlineBatch(now);
  let reminderCreated = 0;
  let overdueCreated = 0;

  const dueSoonUpper = new Date(now.getTime() + TASK_DUE_SOON_LEAD_MS);
  const href = requirementPersonalInboxHref();

  for (const tenantId of tenantIds) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { locale: true, timezone: true },
    });
    const locale = tenant?.locale ?? "de-CH";
    const timeZone = tenant?.timezone ?? "Europe/Zurich";

    const reminderCandidates = await fetchRecipientBatch(
      {
        tenantId,
        removedAt: null,
        resolutionStatus: "OPEN",
        requirement: {
          status: "ACTIVE",
          dueAt: { gt: now, lte: dueSoonUpper },
        },
      },
      now,
    );

    if (reminderCandidates.length > 0) {
      const subjectContexts = await loadSubjectPersonNotificationContexts(
        tenantId,
        reminderCandidates.map((r) => r.subjectPersonId),
      );

      const reminderPairs: Array<{
        row: (typeof reminderCandidates)[number];
        recipientUserId: string;
      }> = [];

      for (const row of reminderCandidates) {
        const dueAt = row.requirement.dueAt;
        if (!dueAt) continue;
        const subject = subjectContexts.get(row.subjectPersonId);
        if (!subject) continue;
        for (const userId of resolveNotificationUserIdsForSubject(subject)) {
          reminderPairs.push({ row, recipientUserId: userId });
        }
      }

      const reminderPrefs = await loadEffectivePreferencesForUsers(
        prisma,
        tenantId,
        reminderPairs.map((p) => p.recipientUserId),
        NotificationTypeEnum.REQUIREMENT_REMINDER,
      );

      for (const pair of reminderPairs) {
        const dueAt = pair.row.requirement.dueAt!;
        const subject = subjectContexts.get(pair.row.subjectPersonId)!;
        const notifyAsGuardian = isGuardianNotificationRecipient(
          pair.recipientUserId,
          subject,
        );
        const dueLabel = formatTaskDueLabel(dueAt, locale, timeZone);
        const copy = buildRequirementReminderCopy({
          requirementTitle: pair.row.requirement.title,
          subjectDisplayName: subject.displayName,
          notifyAsGuardian,
          dueLabel,
        });
        const pref = reminderPrefs.get(pair.recipientUserId)!;
        const dueAtIso = dueAt.toISOString();

        const result = await prisma.$transaction(async (tx) =>
          createNotificationIdempotent(tx, {
            tenantId,
            recipientUserId: pair.recipientUserId,
            type: NotificationTypeEnum.REQUIREMENT_REMINDER,
            title: copy.title,
            body: copy.body,
            href,
            entityType: NotificationEntityType.REQUIREMENT,
            entityId: pair.row.requirement.id,
            deduplicationKey: buildRequirementReminderDedupKey({
              recipientId: pair.row.id,
              recipientUserId: pair.recipientUserId,
              dueAtIso,
            }),
            preferences: pref,
          }),
        );
        if (result?.kind === "CREATED") reminderCreated += 1;
      }
    }

    const overdueCandidates = await fetchRecipientBatch(
      {
        tenantId,
        removedAt: null,
        resolutionStatus: "OPEN",
        requirement: {
          status: "ACTIVE",
          dueAt: { lte: now },
        },
      },
      now,
    );

    if (overdueCandidates.length > 0) {
      const subjectContexts = await loadSubjectPersonNotificationContexts(
        tenantId,
        overdueCandidates.map((r) => r.subjectPersonId),
      );

      const overduePairs: Array<{
        row: (typeof overdueCandidates)[number];
        recipientUserId: string;
      }> = [];

      for (const row of overdueCandidates) {
        const dueAt = row.requirement.dueAt;
        if (!dueAt) continue;
        const subject = subjectContexts.get(row.subjectPersonId);
        if (!subject) continue;
        for (const userId of resolveNotificationUserIdsForSubject(subject)) {
          overduePairs.push({ row, recipientUserId: userId });
        }
      }

      const overduePrefs = await loadEffectivePreferencesForUsers(
        prisma,
        tenantId,
        overduePairs.map((p) => p.recipientUserId),
        NotificationTypeEnum.REQUIREMENT_OVERDUE,
      );

      for (const pair of overduePairs) {
        const dueAt = pair.row.requirement.dueAt!;
        const subject = subjectContexts.get(pair.row.subjectPersonId)!;
        const notifyAsGuardian = isGuardianNotificationRecipient(
          pair.recipientUserId,
          subject,
        );
        const dueLabel = formatTaskDueLabel(dueAt, locale, timeZone);
        const copy = buildRequirementOverdueCopy({
          requirementTitle: pair.row.requirement.title,
          subjectDisplayName: subject.displayName,
          notifyAsGuardian,
          dueLabel,
        });
        const pref = overduePrefs.get(pair.recipientUserId)!;
        const dueAtIso = dueAt.toISOString();

        const result = await prisma.$transaction(async (tx) =>
          createNotificationIdempotent(tx, {
            tenantId,
            recipientUserId: pair.recipientUserId,
            type: NotificationTypeEnum.REQUIREMENT_OVERDUE,
            title: copy.title,
            body: copy.body,
            href,
            entityType: NotificationEntityType.REQUIREMENT,
            entityId: pair.row.requirement.id,
            deduplicationKey: buildRequirementOverdueDedupKey({
              recipientId: pair.row.id,
              recipientUserId: pair.recipientUserId,
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
    reminderCreated,
    overdueCreated,
    tenantsProcessed: tenantIds.length,
  };
}
