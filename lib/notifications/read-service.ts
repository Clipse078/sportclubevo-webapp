import type { Prisma } from "@prisma/client";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NOTIFICATION_CENTER_PAGE_SIZE, NOTIFICATION_HEADER_LATEST_LIMIT } from "./constants";

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

/** In-app inbox visibility follows successful IN_APP channel delivery rows. */
export function inAppVisibleNotificationWhere(): Prisma.NotificationWhereInput {
  return {
    deliveries: {
      some: {
        channel: NotificationChannel.IN_APP,
        status: NotificationDeliveryStatus.SENT,
      },
    },
  };
}

export async function getNotificationHeaderSummary(
  tenantId: string,
  userId: string,
): Promise<{ unreadCount: number; latest: NotificationListItem[] }> {
  const baseWhere: Prisma.NotificationWhereInput = {
    tenantId,
    recipientUserId: userId,
    ...inAppVisibleNotificationWhere(),
  };

  const unreadCount = await prisma.notification.count({
    where: { ...baseWhere, readAt: null },
  });

  const rows = await prisma.notification.findMany({
    where: baseWhere,
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_HEADER_LATEST_LIMIT,
  });

  return {
    unreadCount,
    latest: rows.map(mapRow),
  };
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
    ...inAppVisibleNotificationWhere(),
    ...(input.filter === "UNREAD" ? { readAt: null } : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * NOTIFICATION_CENTER_PAGE_SIZE,
      take: NOTIFICATION_CENTER_PAGE_SIZE,
    }),
    prisma.notification.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / NOTIFICATION_CENTER_PAGE_SIZE));

  return {
    items: rows.map(mapRow),
    totalCount,
    pageCount,
  };
}

export async function markNotificationRead(
  tenantId: string,
  userId: string,
  notificationId: string,
  read: boolean,
): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
      recipientUserId: userId,
      ...inAppVisibleNotificationWhere(),
    },
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
    where: {
      tenantId,
      recipientUserId: userId,
      readAt: null,
      ...inAppVisibleNotificationWhere(),
    },
    data: { readAt: new Date() },
  });
  return result.count;
}
