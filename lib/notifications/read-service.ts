import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NOTIFICATION_CENTER_PAGE_SIZE, NOTIFICATION_HEADER_LATEST_LIMIT } from "./constants";
import { getEffectiveNotificationPreference } from "./preference-service";

export class NotificationAccessError extends Error {
  constructor(message = "Notification not found") {
    super(message);
    this.name = "NotificationAccessError";
  }
}

export type NotificationListItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  href: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  unread: boolean;
};

function mapRow(row: {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  href: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationListItem {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    body: row.body,
    href: row.href,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    unread: row.readAt === null,
  };
}

async function isInAppVisible(
  tenantId: string,
  userId: string,
  type: Parameters<typeof getEffectiveNotificationPreference>[2],
): Promise<boolean> {
  const pref = await getEffectiveNotificationPreference(tenantId, userId, type);
  return pref.inAppEnabled;
}

export async function getNotificationHeaderSummary(
  tenantId: string,
  userId: string,
): Promise<{ unreadCount: number; latest: NotificationListItem[] }> {
  const unreadRows = await prisma.notification.findMany({
    where: { tenantId, recipientUserId: userId, readAt: null },
    select: { type: true },
  });
  let unreadCount = 0;
  for (const row of unreadRows) {
    if (await isInAppVisible(tenantId, userId, row.type)) unreadCount += 1;
  }

  const rows = await prisma.notification.findMany({
    where: { tenantId, recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_HEADER_LATEST_LIMIT + 30,
  });

  const latest: NotificationListItem[] = [];
  for (const row of rows) {
    if (!(await isInAppVisible(tenantId, userId, row.type))) continue;
    latest.push(mapRow(row));
    if (latest.length >= NOTIFICATION_HEADER_LATEST_LIMIT) break;
  }

  return { unreadCount, latest };
}

export async function listNotificationsForUser(input: {
  tenantId: string;
  userId: string;
  filter: "ALL" | "UNREAD";
  page: number;
}): Promise<{ items: NotificationListItem[]; totalCount: number; pageCount: number }> {
  const page = Math.max(1, input.page);
  const where: Prisma.NotificationWhereInput = {
    tenantId: input.tenantId,
    recipientUserId: input.userId,
    ...(input.filter === "UNREAD" ? { readAt: null } : {}),
  };

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * NOTIFICATION_CENTER_PAGE_SIZE,
    take: NOTIFICATION_CENTER_PAGE_SIZE,
  });

  const items: NotificationListItem[] = [];
  for (const row of rows) {
    const visibleInApp = await isInAppVisible(input.tenantId, input.userId, row.type);
    if (!visibleInApp) continue;
    items.push(mapRow(row));
  }

  const totalCount = await prisma.notification.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / NOTIFICATION_CENTER_PAGE_SIZE));

  return { items, totalCount, pageCount };
}

export async function markNotificationRead(
  tenantId: string,
  userId: string,
  notificationId: string,
  read: boolean,
): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, tenantId, recipientUserId: userId },
    data: { readAt: read ? new Date() : null },
  });
  if (result.count !== 1) {
    throw new NotificationAccessError();
  }
}

export async function markAllNotificationsRead(
  tenantId: string,
  userId: string,
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { tenantId, recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
