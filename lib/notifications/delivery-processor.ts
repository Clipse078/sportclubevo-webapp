import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveSecurityLinkBaseUrl } from "@/lib/server/security-link-url";
import {
  NOTIFICATION_EMAIL_DELIVERY_BATCH_SIZE,
  NOTIFICATION_EMAIL_MAX_ATTEMPTS,
  NOTIFICATION_LOG_PREFIX,
} from "./constants";
import {
  getNotificationEmailProvider,
  NotificationEmailProviderError,
} from "./email/notification-email-provider";

export type ProcessPendingDeliveriesResult = {
  examined: number;
  sent: number;
  failed: number;
  skipped: number;
  claimed: number;
};

type DeliveryRow = Prisma.NotificationDeliveryGetPayload<{
  include: {
    notification: {
      include: {
        recipient: { select: { email: true } };
        tenant: { select: { name: true, locale: true, timezone: true } };
      };
    };
  };
}>;

export async function processPendingNotificationDeliveries(
  batchSize = NOTIFICATION_EMAIL_DELIVERY_BATCH_SIZE,
): Promise<ProcessPendingDeliveriesResult> {
  const candidates = await prisma.notificationDelivery.findMany({
    where: {
      channel: NotificationChannel.EMAIL,
      status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] },
      attemptCount: { lt: NOTIFICATION_EMAIL_MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    include: {
      notification: {
        include: {
          recipient: { select: { email: true } },
          tenant: { select: { name: true, locale: true, timezone: true } },
        },
      },
    },
  });

  const summary: ProcessPendingDeliveriesResult = {
    examined: candidates.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    claimed: 0,
  };

  const provider = getNotificationEmailProvider();

  for (const delivery of candidates) {
    const claimed = await claimDelivery(delivery);
    if (!claimed) continue;
    summary.claimed += 1;

    try {
      await sendDeliveryEmail(provider, delivery);
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          deliveredAt: new Date(),
          failureCode: null,
        },
      });
      summary.sent += 1;
      console.info(`${NOTIFICATION_LOG_PREFIX} delivery sent`, {
        deliveryId: delivery.id,
        notificationId: delivery.notificationId,
      });
    } catch (error) {
      const failureCode =
        error instanceof NotificationEmailProviderError
          ? error.code
          : "PROVIDER_FAILURE";
      const attempts = delivery.attemptCount + 1;
      const terminal = attempts >= NOTIFICATION_EMAIL_MAX_ATTEMPTS;

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: terminal
            ? NotificationDeliveryStatus.FAILED
            : NotificationDeliveryStatus.FAILED,
          failureCode: failureCode.slice(0, 120),
        },
      });

      summary.failed += 1;
      console.warn(`${NOTIFICATION_LOG_PREFIX} delivery failed`, {
        deliveryId: delivery.id,
        failureCode,
        attempts,
      });
    }
  }

  return summary;
}

async function claimDelivery(delivery: DeliveryRow): Promise<boolean> {
  const result = await prisma.notificationDelivery.updateMany({
    where: {
      id: delivery.id,
      status: delivery.status,
      attemptCount: delivery.attemptCount,
      channel: NotificationChannel.EMAIL,
    },
    data: {
      status: NotificationDeliveryStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  return result.count === 1;
}

async function sendDeliveryEmail(
  provider: ReturnType<typeof getNotificationEmailProvider>,
  delivery: DeliveryRow,
): Promise<void> {
  const notification = delivery.notification;
  const baseUrl = resolveSecurityLinkBaseUrl();
  const absoluteHref = new URL(notification.href, baseUrl).toString();

  const tenant = notification.tenant;

  const deadlineFromBody =
    notification.body.match(/(?:Fällig|Neue Frist): (.+)$/m)?.[1] ?? null;

  await provider.send({
    tenantId: notification.tenantId,
    to: notification.recipient.email,
    subject: notification.title,
    tenantName: tenant.name,
    platformName: "SportClubEvo",
    notificationTitle: notification.title,
    body: notification.body.replace(/\n/g, " "),
    deadlineLabel: deadlineFromBody,
    ctaLabel: "Aufgabe öffnen",
    ctaUrl: absoluteHref,
    idempotencyKey: `notification-email:${delivery.id}`,
  });
}
