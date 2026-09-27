import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  PUSH_DELIVERY_BATCH_SIZE,
  PUSH_LOG_PREFIX,
  PUSH_MAX_ATTEMPTS,
  PUSH_PROCESSING_LEASE_MS,
} from "@/lib/push/constants";
import { buildPushPayloadFromNotification } from "@/lib/push/push-payload-builder";
import { evaluatePushEnabledForNotificationType } from "@/lib/push/push-preference-seam";
import {
  getPushProvider,
  PushProviderError,
  isWebPushConfigured,
} from "@/lib/push/push-provider";
import { markPushDeviceInvalid } from "@/lib/push/push-device-registration-service";
import { resolvePushTargetsForTenantRecipient } from "@/lib/push/push-target-resolution";
import { getEffectiveNotificationPreference } from "@/lib/notifications/preference-service";

export type ProcessPendingPushDeliveriesResult = {
  examined: number;
  sent: number;
  failed: number;
  skipped: number;
  claimed: number;
  deviceAttempts: number;
  recipientCount: number;
};

type DeliveryRow = Prisma.NotificationDeliveryGetPayload<{
  include: {
    notification: true;
  };
}>;

export async function processPendingPushNotificationDeliveries(
  batchSize = PUSH_DELIVERY_BATCH_SIZE,
): Promise<ProcessPendingPushDeliveriesResult> {
  await recoverStalePushProcessingDeliveries();

  const summary: ProcessPendingPushDeliveriesResult = {
    examined: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    claimed: 0,
    deviceAttempts: 0,
    recipientCount: 0,
  };

  if (!isWebPushConfigured()) {
    const pending = await prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.PUSH,
        status: NotificationDeliveryStatus.PENDING,
      },
      take: batchSize,
      select: { id: true },
    });
    summary.examined = pending.length;
    if (pending.length > 0) {
      await prisma.notificationDelivery.updateMany({
        where: { id: { in: pending.map((row) => row.id) } },
        data: {
          status: NotificationDeliveryStatus.SKIPPED,
          failureCode: "NOT_CONFIGURED",
        },
      });
      summary.skipped += pending.length;
    }
    return summary;
  }

  const candidates = await prisma.notificationDelivery.findMany({
    where: {
      channel: NotificationChannel.PUSH,
      status: {
        in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED],
      },
      attemptCount: { lt: PUSH_MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    include: { notification: true },
  });

  summary.examined = candidates.length;
  const provider = getPushProvider();
  const processedRecipients = new Set<string>();

  for (const delivery of candidates) {
    const preferences = await getEffectiveNotificationPreference(
      delivery.tenantId,
      delivery.notification.recipientUserId,
      delivery.notification.type,
    );
    if (!evaluatePushEnabledForNotificationType(delivery.notification.type, preferences)) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SKIPPED,
          failureCode: "PUSH_NOT_ELIGIBLE",
        },
      });
      summary.skipped += 1;
      continue;
    }

    const claimed = await claimPushDelivery(delivery);
    if (!claimed) continue;
    summary.claimed += 1;
    processedRecipients.add(delivery.notification.recipientUserId);

    const targets = await resolvePushTargetsForTenantRecipient({
      tenantId: delivery.tenantId,
      recipientUserId: delivery.notification.recipientUserId,
    });

    if (targets.length === 0) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SKIPPED,
          failureCode: "NO_PUSH_DEVICE",
        },
      });
      summary.skipped += 1;
      continue;
    }

    const payload = buildPushPayloadFromNotification({
      tenantId: delivery.notification.tenantId,
      type: delivery.notification.type,
      title: delivery.notification.title,
      body: delivery.notification.body,
      href: delivery.notification.href,
      entityType: delivery.notification.entityType,
      entityId: delivery.notification.entityId,
    });

    let snapshotId: string | null = null;
    if (
      delivery.notification.entityType === "COMMUNICATION" &&
      delivery.notification.entityId
    ) {
      const snapshot = await prisma.platformCommunicationRecipientSnapshot.findFirst({
        where: {
          tenantId: delivery.tenantId,
          communicationId: delivery.notification.entityId,
          deliveryUserId: delivery.notification.recipientUserId,
        },
        select: { id: true },
      });
      snapshotId = snapshot?.id ?? null;
    }

    let successCount = 0;
    let permanentFailure = false;

    for (const target of targets) {
      summary.deviceAttempts += 1;
      const attempt = await ensurePushAttempt({
        tenantId: delivery.tenantId,
        notificationDeliveryId: delivery.id,
        pushDeviceRegistrationId: target.registration.id,
        snapshotId,
      });

      if (attempt.status === NotificationDeliveryStatus.SENT) {
        successCount += 1;
        continue;
      }

      try {
        const sendResult = await provider.send({
          subscriptionJson: target.registration.subscriptionJson,
          payload,
          idempotencyKey: `push:${delivery.id}:${target.registration.id}`,
        });
        await prisma.notificationPushDeliveryAttempt.update({
          where: { id: attempt.id },
          data: {
            status: NotificationDeliveryStatus.SENT,
            providerMessageId: sendResult.providerMessageId,
            failureCode: null,
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
        successCount += 1;
      } catch (error) {
        const failureCode =
          error instanceof PushProviderError ? error.code : "PROVIDER_FAILURE";
        const permanent =
          error instanceof PushProviderError ? error.permanent : false;
        if (failureCode === "INVALID_TOKEN") {
          await markPushDeviceInvalid(target.registration.id);
        }
        if (permanent) permanentFailure = true;

        await prisma.notificationPushDeliveryAttempt.update({
          where: { id: attempt.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            failureCode: failureCode.slice(0, 120),
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
      }
    }

    if (successCount > 0) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          deliveredAt: new Date(),
          failureCode: null,
        },
      });
      summary.sent += 1;
    } else if (permanentFailure) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          failureCode: "ALL_DEVICES_FAILED",
        },
      });
      summary.failed += 1;
    } else {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          failureCode: "TRANSIENT_DEVICE_FAILURE",
        },
      });
      summary.failed += 1;
    }
  }

  summary.recipientCount = processedRecipients.size;
  return summary;
}

async function ensurePushAttempt(input: {
  tenantId: string;
  notificationDeliveryId: string;
  pushDeviceRegistrationId: string;
  snapshotId: string | null;
}): Promise<{ id: string; status: NotificationDeliveryStatus }> {
  const existing = await prisma.notificationPushDeliveryAttempt.findUnique({
    where: {
      notificationDeliveryId_pushDeviceRegistrationId: {
        notificationDeliveryId: input.notificationDeliveryId,
        pushDeviceRegistrationId: input.pushDeviceRegistrationId,
      },
    },
    select: { id: true, status: true },
  });
  if (existing) return existing;

  try {
    const created = await prisma.notificationPushDeliveryAttempt.create({
      data: {
        tenantId: input.tenantId,
        notificationDeliveryId: input.notificationDeliveryId,
        pushDeviceRegistrationId: input.pushDeviceRegistrationId,
        platformCommunicationRecipientSnapshotId: input.snapshotId,
        status: NotificationDeliveryStatus.PENDING,
      },
      select: { id: true, status: true },
    });
    return created;
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error;
    const row = await prisma.notificationPushDeliveryAttempt.findUniqueOrThrow({
      where: {
        notificationDeliveryId_pushDeviceRegistrationId: {
          notificationDeliveryId: input.notificationDeliveryId,
          pushDeviceRegistrationId: input.pushDeviceRegistrationId,
        },
      },
      select: { id: true, status: true },
    });
    return row;
  }
}

async function claimPushDelivery(delivery: DeliveryRow): Promise<boolean> {
  const result = await prisma.notificationDelivery.updateMany({
    where: {
      id: delivery.id,
      status: delivery.status,
      attemptCount: delivery.attemptCount,
      channel: NotificationChannel.PUSH,
    },
    data: {
      status: NotificationDeliveryStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  return result.count === 1;
}

export async function recoverStalePushProcessingDeliveries(
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - PUSH_PROCESSING_LEASE_MS);
  const result = await prisma.notificationDelivery.updateMany({
    where: {
      channel: NotificationChannel.PUSH,
      status: NotificationDeliveryStatus.PROCESSING,
      lastAttemptAt: { lt: cutoff },
      attemptCount: { lt: PUSH_MAX_ATTEMPTS },
    },
    data: {
      status: NotificationDeliveryStatus.FAILED,
      failureCode: "PROCESSING_LEASE_EXPIRED",
    },
  });
  return result.count;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function logPushDeliverySummary(summary: ProcessPendingPushDeliveriesResult): void {
  console.info(`${PUSH_LOG_PREFIX} delivery batch`, {
    examined: summary.examined,
    sent: summary.sent,
    failed: summary.failed,
    skipped: summary.skipped,
    deviceAttempts: summary.deviceAttempts,
    recipientCount: summary.recipientCount,
  });
}
