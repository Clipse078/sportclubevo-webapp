import type { Prisma } from "@prisma/client";
import {
  NotificationEntityType,
  NotificationType as NotificationTypeEnum,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  buildRequirementAssignedDedupKey,
  buildRequirementCancelledDedupKey,
  requirementPersonalExecutionHref,
  requirementPersonalInboxHref,
} from "./deduplication";
import { loadEffectivePreferencesForUsers } from "./preference-service";
import { NOTIFICATION_LOG_PREFIX } from "./constants";
import { createNotificationIdempotent } from "./notification-service";
import {
  buildRequirementAssignedCopy,
  buildRequirementCancelledCopy,
} from "./requirement-copy";
import {
  isGuardianNotificationRecipient,
  loadSubjectPersonNotificationContexts,
  resolveNotificationUserIdsForSubject,
} from "./requirement-recipient-resolution";
import { formatTaskDueLabel } from "./task-copy";

export type RequirementRecipientNotificationRow = {
  id: string;
  subjectPersonId: string;
};

export async function emitRequirementAssignedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    requirementId: string;
    requirementTitle: string;
    dueAt: Date | null;
    recipients: RequirementRecipientNotificationRow[];
    locale: string;
    timeZone: string;
  },
): Promise<void> {
  try {
    await emitRequirementAssignedNotificationsInner(tx, input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} requirement assigned emit failed`, {
      tenantId: input.tenantId,
      requirementId: input.requirementId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function emitRequirementAssignedNotificationsInner(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    requirementId: string;
    requirementTitle: string;
    dueAt: Date | null;
    recipients: RequirementRecipientNotificationRow[];
    locale: string;
    timeZone: string;
  },
): Promise<void> {
  if (input.recipients.length === 0) return;

  const subjectContexts = await loadSubjectPersonNotificationContexts(
    input.tenantId,
    input.recipients.map((r) => r.subjectPersonId),
  );

  const pairs: Array<{
    recipientId: string;
    recipientUserId: string;
    subjectPersonId: string;
  }> = [];

  for (const recipient of input.recipients) {
    const subject = subjectContexts.get(recipient.subjectPersonId);
    if (!subject) continue;
    for (const userId of resolveNotificationUserIdsForSubject(subject)) {
      pairs.push({
        recipientId: recipient.id,
        recipientUserId: userId,
        subjectPersonId: recipient.subjectPersonId,
      });
    }
  }

  if (pairs.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    pairs.map((p) => p.recipientUserId),
    NotificationTypeEnum.REQUIREMENT_ASSIGNED,
  );

  const dueLabel = input.dueAt
    ? formatTaskDueLabel(input.dueAt, input.locale, input.timeZone)
    : null;

  for (const pair of pairs) {
    const subject = subjectContexts.get(pair.subjectPersonId)!;
    const notifyAsGuardian = isGuardianNotificationRecipient(pair.recipientUserId, subject);
    const copy = buildRequirementAssignedCopy({
      requirementTitle: input.requirementTitle,
      subjectDisplayName: subject.displayName,
      notifyAsGuardian,
    });
    const pref = preferences.get(pair.recipientUserId)!;
    const body =
      dueLabel && !notifyAsGuardian
        ? `${copy.body}\n\nFällig: ${dueLabel}`
        : copy.body;

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId: pair.recipientUserId,
      type: NotificationTypeEnum.REQUIREMENT_ASSIGNED,
      title: copy.title,
      body,
      href: requirementPersonalExecutionHref(pair.recipientId),
      entityType: NotificationEntityType.REQUIREMENT,
      entityId: input.requirementId,
      deduplicationKey: buildRequirementAssignedDedupKey({
        recipientId: pair.recipientId,
        recipientUserId: pair.recipientUserId,
      }),
      preferences: pref,
    });
  }
}

export async function emitRequirementCancelledNotifications(
  input: {
    tenantId: string;
    requirementId: string;
    requirementTitle: string;
    recipients: RequirementRecipientNotificationRow[];
  },
): Promise<void> {
  try {
    await emitRequirementCancelledNotificationsInner(input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} requirement cancelled emit failed`, {
      tenantId: input.tenantId,
      requirementId: input.requirementId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function emitRequirementCancelledNotificationsInner(input: {
  tenantId: string;
  requirementId: string;
  requirementTitle: string;
  recipients: RequirementRecipientNotificationRow[];
}): Promise<void> {
  if (input.recipients.length === 0) return;

  const subjectContexts = await loadSubjectPersonNotificationContexts(
    input.tenantId,
    input.recipients.map((r) => r.subjectPersonId),
  );

  const pairs: Array<{
    recipientId: string;
    recipientUserId: string;
    subjectPersonId: string;
  }> = [];

  for (const recipient of input.recipients) {
    const subject = subjectContexts.get(recipient.subjectPersonId);
    if (!subject) continue;
    for (const userId of resolveNotificationUserIdsForSubject(subject)) {
      pairs.push({
        recipientId: recipient.id,
        recipientUserId: userId,
        subjectPersonId: recipient.subjectPersonId,
      });
    }
  }

  if (pairs.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    prisma,
    input.tenantId,
    pairs.map((p) => p.recipientUserId),
    NotificationTypeEnum.REQUIREMENT_CANCELLED,
  );

  const href = requirementPersonalInboxHref();

  for (const pair of pairs) {
    const subject = subjectContexts.get(pair.subjectPersonId)!;
    const notifyAsGuardian = isGuardianNotificationRecipient(pair.recipientUserId, subject);
    const copy = buildRequirementCancelledCopy({
      requirementTitle: input.requirementTitle,
      subjectDisplayName: subject.displayName,
      notifyAsGuardian,
    });
    const pref = preferences.get(pair.recipientUserId)!;

    await prisma.$transaction(async (tx) =>
      createNotificationIdempotent(tx, {
        tenantId: input.tenantId,
        recipientUserId: pair.recipientUserId,
        type: NotificationTypeEnum.REQUIREMENT_CANCELLED,
        title: copy.title,
        body: copy.body,
        href,
        entityType: NotificationEntityType.REQUIREMENT,
        entityId: input.requirementId,
        deduplicationKey: buildRequirementCancelledDedupKey({
          recipientId: pair.recipientId,
          recipientUserId: pair.recipientUserId,
        }),
        preferences: pref,
      }),
    );
  }
}
