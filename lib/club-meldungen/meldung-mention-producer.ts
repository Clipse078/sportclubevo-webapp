/**
 * SCE-ANLIEGEN-02 — MELDUNG_MENTION in-app notifications (dedup: messageId + userId).
 */

import type { Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType } from "@prisma/client";
import { NOTIFICATION_LOG_PREFIX } from "@/lib/notifications/constants";
import { buildMeldungMentionDedupKey, meldungHandlerDetailHref } from "@/lib/notifications/deduplication";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import {
  canUserViewMeldungInternalNow,
  loadMeldungMentionAccessRecord,
} from "./meldung-mention-auth";
import { mentionExcerpt } from "./meldung-mention-tokens";

export type MeldungMentionNotificationInput = {
  tenantId: string;
  tenantKey: string;
  meldungId: string;
  caseNumber: string;
  messageId: string;
  commentExcerpt: string;
  actorUserId: string;
  actorDisplayName: string;
  mentionedUserIds: string[];
};

export async function emitMeldungMentionNotifications(
  tx: Prisma.TransactionClient,
  input: MeldungMentionNotificationInput,
): Promise<void> {
  try {
    await emitMeldungMentionNotificationsInTx(tx, input);
  } catch (error) {
    console.error(`${NOTIFICATION_LOG_PREFIX} meldung mention emit failed`, {
      tenantId: input.tenantId,
      meldungId: input.meldungId,
      messageId: input.messageId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function emitMeldungMentionNotificationsInTx(
  tx: Prisma.TransactionClient,
  input: MeldungMentionNotificationInput,
): Promise<void> {
  const recipients = [
    ...new Set(
      input.mentionedUserIds.filter(
        (userId) => userId !== input.actorUserId && userId.trim().length > 0,
      ),
    ),
  ];
  if (recipients.length === 0) return;

  const record = await loadMeldungMentionAccessRecord(input.tenantId, input.meldungId);
  if (!record) return;

  const eligible: string[] = [];
  for (const userId of recipients) {
    if (await canUserViewMeldungInternalNow(input.tenantId, userId, record)) {
      eligible.push(userId);
    }
  }
  if (eligible.length === 0) return;

  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    eligible,
    NotificationType.MELDUNG_MENTION,
  );

  const title = `${input.actorDisplayName} erwähnt Sie in ${input.caseNumber}`;
  const body = mentionExcerpt(input.commentExcerpt);
  const href = meldungHandlerDetailHref(input.tenantKey, input.meldungId);

  for (const recipientUserId of eligible) {
    const pref = preferences.get(recipientUserId);
    if (!pref) continue;

    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationType.MELDUNG_MENTION,
      entityType: NotificationEntityType.CLUB_MELDUNG,
      entityId: input.meldungId,
      title,
      body,
      href,
      deduplicationKey: buildMeldungMentionDedupKey({
        messageId: input.messageId,
        recipientUserId,
      }),
      preferences: pref,
    });
  }
}