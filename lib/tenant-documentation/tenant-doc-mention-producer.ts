import type { Prisma } from "@prisma/client";
import {
  NotificationEntityType,
  NotificationType as NotificationTypeEnum,
} from "@prisma/client";

import { diffNewMentionUserIds } from "@/lib/collaboration/mentions/extract-mention-user-ids";
import { NOTIFICATION_LOG_PREFIX } from "@/lib/notifications/constants";
import { buildTenantDocMentionDedupKey } from "@/lib/notifications/deduplication";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import { buildTenantDocMentionCopy } from "@/lib/notifications/tenant-documentation-copy";
import { tenantDocumentationPageHref } from "@/lib/tenant-documentation/navigation";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";
import { TenantDocumentationAccessLevel } from "@prisma/client";
import { accessLevelPermits } from "@/lib/tenant-documentation/authorization";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

export type TenantDocMentionNotificationInput = {
  tenantId: string;
  pageId: string;
  pageTitle: string;
  publishedVersionId: string;
  actorUserId: string;
  actorDisplayName: string;
  previousPublishedContent: unknown;
  nextPublishedContent: unknown;
};

export async function emitTenantDocumentationMentionNotifications(
  input: TenantDocMentionNotificationInput,
): Promise<void> {
  try {
    const newlyMentioned = diffNewMentionUserIds(
      input.previousPublishedContent,
      input.nextPublishedContent,
    );
    const recipients = [...new Set(newlyMentioned.filter((id) => id !== input.actorUserId))];
    if (recipients.length === 0) return;

    const eligible: string[] = [];
    for (const userId of recipients) {
      const effective = await getRequestEffectivePermissions(userId, input.tenantId);
      const permissionKeys = [...effective.platform, ...effective.tenant];
      const actor = await resolveTenantDocumentationActor({
        tenantId: input.tenantId,
        userId,
        permissionKeys,
      });
      const { actorCanViewPublishedPage } = await import(
        "@/lib/tenant-documentation/page-visibility-service"
      );
      if (await actorCanViewPublishedPage(actor, input.pageId)) {
        eligible.push(userId);
      }
    }

    if (eligible.length === 0) return;

    const { prisma } = await import("@/lib/db/prisma");
    await prisma.$transaction(async (tx) => {
      await emitTenantDocumentationMentionNotificationsInTx(tx, {
        ...input,
        mentionedUserIds: eligible,
      });
    });
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} tenant documentation mention emit failed`, {
      tenantId: input.tenantId,
      pageId: input.pageId,
      publishedVersionId: input.publishedVersionId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function emitTenantDocumentationMentionNotificationsInTx(
  tx: Prisma.TransactionClient,
  input: TenantDocMentionNotificationInput & { mentionedUserIds: string[] },
): Promise<void> {
  const recipients = [...new Set(input.mentionedUserIds.filter((id) => id !== input.actorUserId))];
  if (recipients.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    recipients,
    NotificationTypeEnum.TENANT_DOCUMENTATION_MENTION,
  );

  const copy = buildTenantDocMentionCopy({
    actorDisplayName: input.actorDisplayName,
    pageTitle: input.pageTitle,
  });
  const href = tenantDocumentationPageHref(input.pageId);

  for (const recipientUserId of recipients) {
    const pref = preferences.get(recipientUserId);
    if (!pref) continue;
    const deduplicationKey = buildTenantDocMentionDedupKey({
      publishedVersionId: input.publishedVersionId,
      recipientUserId,
    });

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationTypeEnum.TENANT_DOCUMENTATION_MENTION,
      title: copy.title,
      body: copy.body,
      href,
      entityType: NotificationEntityType.TENANT_DOCUMENTATION_PAGE,
      entityId: input.pageId,
      deduplicationKey,
      preferences: pref,
    });
  }
}