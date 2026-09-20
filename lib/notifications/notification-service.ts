import type {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
  Prisma,
} from "@prisma/client";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@prisma/client";
import { NOTIFICATION_LOG_PREFIX } from "./constants";
import type { NotificationChannelDefaults } from "./defaults";
import { notificationTypeCategory } from "./deduplication";

export type CreateNotificationInput = {
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  deduplicationKey: string;
  preferences: NotificationChannelDefaults;
};

export type CreateNotificationResult =
  | { kind: "CREATED"; notificationId: string }
  | { kind: "DEDUPLICATED"; notificationId: string };

async function createDeliveries(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    notificationId: string;
    preferences: NotificationChannelDefaults;
  },
): Promise<void> {
  const rows: Prisma.NotificationDeliveryCreateManyInput[] = [];

  if (input.preferences.inAppEnabled) {
    rows.push({
      tenantId: input.tenantId,
      notificationId: input.notificationId,
      channel: NotificationChannel.IN_APP,
      status: NotificationDeliveryStatus.SENT,
      deliveredAt: new Date(),
      provider: "IN_APP",
    });
  } else {
    rows.push({
      tenantId: input.tenantId,
      notificationId: input.notificationId,
      channel: NotificationChannel.IN_APP,
      status: NotificationDeliveryStatus.SKIPPED,
      provider: "IN_APP",
      failureCode: "PREFERENCE_DISABLED",
    });
  }

  if (input.preferences.emailEnabled) {
    rows.push({
      tenantId: input.tenantId,
      notificationId: input.notificationId,
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.PENDING,
      provider: "RESEND",
    });
  } else {
    rows.push({
      tenantId: input.tenantId,
      notificationId: input.notificationId,
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.SKIPPED,
      provider: "RESEND",
      failureCode: "PREFERENCE_DISABLED",
    });
  }

  await tx.notificationDelivery.createMany({ data: rows, skipDuplicates: true });
}

export async function createNotificationIdempotent(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
): Promise<CreateNotificationResult | null> {
  if (!input.preferences.inAppEnabled && !input.preferences.emailEnabled) {
    return null;
  }

  const category: NotificationCategory = notificationTypeCategory(input.type);

  try {
    const created = await tx.notification.create({
      data: {
        tenantId: input.tenantId,
        recipientUserId: input.recipientUserId,
        type: input.type,
        category,
        title: input.title,
        body: input.body,
        href: input.href,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        deduplicationKey: input.deduplicationKey,
      },
    });

    await createDeliveries(tx, {
      tenantId: input.tenantId,
      notificationId: created.id,
      preferences: input.preferences,
    });

    console.info(`${NOTIFICATION_LOG_PREFIX} created`, {
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      notificationId: created.id,
    });

    return { kind: "CREATED", notificationId: created.id };
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await tx.notification.findUnique({
      where: {
        tenantId_deduplicationKey: {
          tenantId: input.tenantId,
          deduplicationKey: input.deduplicationKey,
        },
      },
      select: { id: true },
    });

    if (existing) {
      console.info(`${NOTIFICATION_LOG_PREFIX} deduplicated`, {
        tenantId: input.tenantId,
        type: input.type,
        deduplicationKey: input.deduplicationKey,
      });
      return { kind: "DEDUPLICATED", notificationId: existing.id };
    }

    throw error;
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
