import { NotificationEntityType, NotificationType, type Prisma } from "@prisma/client";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";

function meldungReporterHref(tenantKey: string, meldungId: string) {
  return `/tenant/${encodeURIComponent(tenantKey)}/anliegen/${encodeURIComponent(meldungId)}`;
}

function meldungHandlerHref(tenantKey: string, meldungId: string) {
  return `/tenant/${encodeURIComponent(tenantKey)}/cockpit/meldungen/${encodeURIComponent(meldungId)}`;
}

async function resolveTenantKey(tx: Prisma.TransactionClient, tenantId: string) {
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { key: true } });
  return tenant?.key ?? tenantId;
}

export async function emitMeldungAssignedNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    meldungId: string;
    caseNumber: string;
    subject: string;
    assigneeUserId: string;
    actorUserId: string;
  },
): Promise<void> {
  if (input.assigneeUserId === input.actorUserId) return;
  const tenantKey = await resolveTenantKey(tx, input.tenantId);
  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    [input.assigneeUserId],
    NotificationType.MELDUNG_ASSIGNED,
  );
  const pref = preferences.get(input.assigneeUserId);
  if (!pref) return;

  await createNotificationIdempotent(tx, {
    tenantId: input.tenantId,
    recipientUserId: input.assigneeUserId,
    type: NotificationType.MELDUNG_ASSIGNED,
    entityType: NotificationEntityType.CLUB_MELDUNG,
    entityId: input.meldungId,
    title: `Neue Zuständigkeit: ${input.caseNumber}`,
    body: input.subject,
    href: meldungHandlerHref(tenantKey, input.meldungId),
    deduplicationKey: `meldung-assigned:${input.meldungId}:${input.assigneeUserId}`,
    preferences: pref,
  });
}

export async function emitMeldungReporterReplyNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    meldungId: string;
    caseNumber: string;
    subject: string;
    reporterUserId: string;
    actorUserId: string;
  },
): Promise<void> {
  const tenantKey = await resolveTenantKey(tx, input.tenantId);
  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    [input.reporterUserId],
    NotificationType.MELDUNG_REPORTER_REPLY,
  );
  const pref = preferences.get(input.reporterUserId);
  if (!pref) return;

  await createNotificationIdempotent(tx, {
    tenantId: input.tenantId,
    recipientUserId: input.reporterUserId,
    type: NotificationType.MELDUNG_REPORTER_REPLY,
    entityType: NotificationEntityType.CLUB_MELDUNG,
    entityId: input.meldungId,
    title: `Antwort zu ${input.caseNumber}`,
    body: input.subject,
    href: meldungReporterHref(tenantKey, input.meldungId),
    deduplicationKey: `meldung-reporter-reply:${input.meldungId}:${input.actorUserId}`,
    preferences: pref,
  });
}

export async function emitMeldungResolvedNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    meldungId: string;
    caseNumber: string;
    subject: string;
    reporterUserId: string;
    actorUserId: string;
  },
): Promise<void> {
  if (input.reporterUserId === input.actorUserId) return;
  const tenantKey = await resolveTenantKey(tx, input.tenantId);
  const preferences = await loadEffectivePreferencesForUsers(
    tx,
    input.tenantId,
    [input.reporterUserId],
    NotificationType.MELDUNG_RESOLVED,
  );
  const pref = preferences.get(input.reporterUserId);
  if (!pref) return;

  await createNotificationIdempotent(tx, {
    tenantId: input.tenantId,
    recipientUserId: input.reporterUserId,
    type: NotificationType.MELDUNG_RESOLVED,
    entityType: NotificationEntityType.CLUB_MELDUNG,
    entityId: input.meldungId,
    title: `${input.caseNumber} erledigt`,
    body: input.subject,
    href: meldungReporterHref(tenantKey, input.meldungId),
    deduplicationKey: `meldung-resolved:${input.meldungId}`,
    preferences: pref,
  });
}