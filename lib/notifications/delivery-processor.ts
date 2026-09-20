import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  NOTIFICATION_EMAIL_DELIVERY_BATCH_SIZE,
  NOTIFICATION_EMAIL_MAX_ATTEMPTS,
  NOTIFICATION_EMAIL_PROCESSING_LEASE_MS,
  NOTIFICATION_LOG_PREFIX,
} from "./constants";
import { buildNotificationAbsoluteHref } from "./internal-href";
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
  await recoverStaleProcessingDeliveries();

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
      const recipientEmail = delivery.notification.recipient.email?.trim();
      if (!recipientEmail) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.SKIPPED,
            failureCode: "MISSING_RECIPIENT_EMAIL",
          },
        });
        summary.skipped += 1;
        continue;
      }

      const sendResult = await sendDeliveryEmail(provider, delivery, recipientEmail);
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          deliveredAt: new Date(),
          failureCode: null,
          providerMessageId: sendResult.providerMessageId,
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

export async function recoverStaleProcessingDeliveries(
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - NOTIFICATION_EMAIL_PROCESSING_LEASE_MS);
  const result = await prisma.notificationDelivery.updateMany({
    where: {
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.PROCESSING,
      lastAttemptAt: { lt: cutoff },
      attemptCount: { lt: NOTIFICATION_EMAIL_MAX_ATTEMPTS },
    },
    data: {
      status: NotificationDeliveryStatus.FAILED,
      failureCode: "PROCESSING_LEASE_EXPIRED",
    },
  });
  return result.count;
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
  recipientEmail: string,
): Promise<{ providerMessageId: string }> {
  const notification = delivery.notification;
  const absoluteHref = buildNotificationAbsoluteHref(notification.href);

  const tenant = notification.tenant;

  const deadlineFromBody =
    notification.body.match(/(?:Fällig|Neue Frist): (.+)$/m)?.[1] ?? null;

  return provider.send({
    tenantId: notification.tenantId,
    to: recipientEmail,
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
