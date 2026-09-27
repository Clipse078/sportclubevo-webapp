import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  PushDevicePlatform,
  PushDeviceRegistrationStatus,
} from "@prisma/client";
import { PushProviderError } from "../push-provider";
import {
  registerPushDevice,
  revokePushDevice,
} from "../push-device-registration-service";
import { resolvePushTargetsForTenantRecipient } from "../push-target-resolution";
import { buildPushPayloadFromNotification } from "../push-payload-builder";
import { isNotificationTypePushEligible } from "../push-eligibility";
import { processPendingPushNotificationDeliveries } from "../push-delivery-processor";
import * as pushProviderModule from "../push-provider";
import * as preferenceServiceModule from "@/lib/notifications/preference-service";

const notificationServiceMocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  deliveryCreateMany: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  pushDeviceRegistration: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  tenantMembership: { findUnique: vi.fn() },
  person: { findFirst: vi.fn() },
  notificationDelivery: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  notificationPushDeliveryAttempt: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: { findFirst: vi.fn() },
  userNotificationPreference: { findUnique: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
    fn({
      pushDeviceRegistration: prismaMocks.pushDeviceRegistration,
      auditLog: { create: vi.fn() },
    }),
  ),
  auditLog: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMocks }));

describe("SCE-COMM-09 mobile push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("device registration", () => {
    it("registers device for authenticated user idempotently", async () => {
      prismaMocks.pushDeviceRegistration.findUnique.mockResolvedValue(null);
      prismaMocks.pushDeviceRegistration.create.mockResolvedValue({
        id: "reg-1",
        userId: "user-1",
        installationId: "inst-1",
        platform: PushDevicePlatform.WEB,
        provider: "WEB_PUSH",
        status: PushDeviceRegistrationStatus.ACTIVE,
        lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const dto = await registerPushDevice({
        userId: "user-1",
        installationId: "inst-1",
        platform: PushDevicePlatform.WEB,
        subscriptionJson: JSON.stringify({ endpoint: "https://push.example/1" }),
      });

      expect(dto.id).toBe("reg-1");
      expect(prismaMocks.pushDeviceRegistration.create).toHaveBeenCalledTimes(1);

      prismaMocks.pushDeviceRegistration.findUnique.mockResolvedValue({
        id: "reg-1",
        userId: "user-1",
        installationId: "inst-1",
      });
      prismaMocks.pushDeviceRegistration.update.mockResolvedValue({
        id: "reg-1",
        userId: "user-1",
        installationId: "inst-1",
        platform: PushDevicePlatform.WEB,
        provider: "WEB_PUSH",
        status: PushDeviceRegistrationStatus.ACTIVE,
        lastSeenAt: new Date("2026-01-02T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      });

      await registerPushDevice({
        userId: "user-1",
        installationId: "inst-1",
        platform: PushDevicePlatform.WEB,
        subscriptionJson: JSON.stringify({ endpoint: "https://push.example/2" }),
      });
      expect(prismaMocks.pushDeviceRegistration.update).toHaveBeenCalledTimes(1);
      expect(prismaMocks.pushDeviceRegistration.create).toHaveBeenCalledTimes(1);
    });

    it("revoke rejects foreign user device", async () => {
      prismaMocks.pushDeviceRegistration.findFirst.mockResolvedValue(null);
      const ok = await revokePushDevice({ userId: "user-a", registrationId: "reg-b" });
      expect(ok).toBe(false);
    });
  });

  describe("target resolution", () => {
    it("excludes tenant-ineligible devices", async () => {
      prismaMocks.tenantMembership.findUnique.mockResolvedValue(null);
      prismaMocks.person.findFirst.mockResolvedValue(null);
      const targets = await resolvePushTargetsForTenantRecipient({
        tenantId: "tenant-a",
        recipientUserId: "user-1",
      });
      expect(targets).toEqual([]);
      expect(prismaMocks.pushDeviceRegistration.findMany).not.toHaveBeenCalled();
    });

    it("returns multiple active devices for one recipient", async () => {
      prismaMocks.tenantMembership.findUnique.mockResolvedValue({ isActive: true });
      prismaMocks.pushDeviceRegistration.findMany.mockResolvedValue([
        { id: "d1", userId: "user-1", platform: "WEB", provider: "WEB_PUSH", subscriptionJson: "{}", status: "ACTIVE" },
        { id: "d2", userId: "user-1", platform: "WEB", provider: "WEB_PUSH", subscriptionJson: "{}", status: "ACTIVE" },
      ]);
      const targets = await resolvePushTargetsForTenantRecipient({
        tenantId: "tenant-a",
        recipientUserId: "user-1",
      });
      expect(targets).toHaveLength(2);
    });
  });

  describe("payload", () => {
    it("builds concise payload with deep link and alert priority", async () => {
      const alert = buildPushPayloadFromNotification({
        tenantId: "tenant-1",
        type: "TEAM_ALERT_PUBLISHED",
        title: "Alarm",
        body: "Details",
        href: "/dashboard/teams/t1/kommunikation?communicationId=c1",
        entityType: "COMMUNICATION",
        entityId: "c1",
      });
      expect(alert.priority).toBe("high");
      expect(alert.data.href).toContain("communicationId=c1");
      expect(alert.data.entityId).toBe("c1");
      expect(alert.body).not.toMatch(/token|subscription/i);

      const message = buildPushPayloadFromNotification({
        tenantId: "tenant-1",
        type: "TEAM_COMMUNICATION_PUBLISHED",
        title: "Hi",
        body: "Preview",
        href: "/dashboard/teams/t1/kommunikation?communicationId=c2",
        entityType: "COMMUNICATION",
        entityId: "c2",
      });
      expect(message.priority).toBe("normal");
    });
  });

  describe("delivery + idempotency", () => {
    it("skips when no device without failing delivery pipeline", async () => {
      vi.spyOn(pushProviderModule, "isWebPushConfigured").mockReturnValue(true);
      vi.spyOn(pushProviderModule, "getPushProvider").mockReturnValue({ send: vi.fn() });
      vi.spyOn(preferenceServiceModule, "getEffectiveNotificationPreference").mockResolvedValue({
        inAppEnabled: true,
        emailEnabled: false,
        pushEnabled: true,
      });

      prismaMocks.notificationDelivery.findMany.mockResolvedValue([
        {
          id: "del-1",
          tenantId: "tenant-1",
          status: NotificationDeliveryStatus.PENDING,
          attemptCount: 0,
          notification: {
            tenantId: "tenant-1",
            recipientUserId: "user-1",
            type: "TEAM_ANNOUNCEMENT_PUBLISHED",
            title: "Title",
            body: "Body",
            href: "/dashboard/teams/t1/kommunikation?communicationId=c1",
            entityType: "COMMUNICATION",
            entityId: "c1",
          },
        },
      ]);
      prismaMocks.notificationDelivery.updateMany.mockResolvedValue({ count: 1 });
      prismaMocks.tenantMembership.findUnique.mockResolvedValue({ isActive: true });
      prismaMocks.pushDeviceRegistration.findMany.mockResolvedValue([]);
      prismaMocks.notificationDelivery.update.mockResolvedValue({});

      const summary = await processPendingPushNotificationDeliveries(10);
      expect(summary.skipped).toBe(1);
      expect(summary.deviceAttempts).toBe(0);
    });

    it("does not duplicate device attempts on repeated processing", async () => {
      const send = vi.fn().mockResolvedValue({ providerMessageId: "msg-1" });
      vi.spyOn(pushProviderModule, "isWebPushConfigured").mockReturnValue(true);
      vi.spyOn(pushProviderModule, "getPushProvider").mockReturnValue({ send });
      vi.spyOn(preferenceServiceModule, "getEffectiveNotificationPreference").mockResolvedValue({
        inAppEnabled: true,
        emailEnabled: false,
        pushEnabled: true,
      });

      const delivery = {
        id: "del-1",
        tenantId: "tenant-1",
        status: NotificationDeliveryStatus.PENDING,
        attemptCount: 0,
        notification: {
          tenantId: "tenant-1",
          recipientUserId: "user-1",
          type: "TEAM_POLL_PUBLISHED",
          title: "Poll",
          body: "Body",
          href: "/dashboard/teams/t1/kommunikation?communicationId=c1",
          entityType: "COMMUNICATION",
          entityId: "c1",
        },
      };

      prismaMocks.notificationDelivery.findMany.mockResolvedValue([delivery]);
      prismaMocks.notificationDelivery.updateMany.mockResolvedValue({ count: 1 });
      prismaMocks.tenantMembership.findUnique.mockResolvedValue({ isActive: true });
      prismaMocks.pushDeviceRegistration.findMany.mockResolvedValue([
        {
          id: "dev-1",
          userId: "user-1",
          platform: "WEB",
          provider: "WEB_PUSH",
          subscriptionJson: JSON.stringify({ endpoint: "https://push.example/1" }),
          status: "ACTIVE",
        },
      ]);
      prismaMocks.notificationPushDeliveryAttempt.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "att-1", status: NotificationDeliveryStatus.SENT });
      prismaMocks.notificationPushDeliveryAttempt.create.mockResolvedValue({
        id: "att-1",
        status: NotificationDeliveryStatus.PENDING,
      });
      prismaMocks.platformCommunicationRecipientSnapshot.findFirst.mockResolvedValue({ id: "snap-1" });
      prismaMocks.notificationDelivery.update.mockResolvedValue({});

      await processPendingPushNotificationDeliveries(10);
      await processPendingPushNotificationDeliveries(10);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("marks invalid token registrations disabled", async () => {
      const send = vi.fn().mockRejectedValue(new PushProviderError("INVALID_TOKEN", true, "gone"));
      vi.spyOn(pushProviderModule, "isWebPushConfigured").mockReturnValue(true);
      vi.spyOn(pushProviderModule, "getPushProvider").mockReturnValue({ send });
      vi.spyOn(preferenceServiceModule, "getEffectiveNotificationPreference").mockResolvedValue({
        inAppEnabled: true,
        emailEnabled: false,
        pushEnabled: true,
      });

      prismaMocks.notificationDelivery.findMany.mockResolvedValue([
        {
          id: "del-1",
          tenantId: "tenant-1",
          status: NotificationDeliveryStatus.PENDING,
          attemptCount: 0,
          notification: {
            tenantId: "tenant-1",
            recipientUserId: "user-1",
            type: "TEAM_REQUEST_PUBLISHED",
            title: "Request",
            body: "Body",
            href: "/dashboard/teams/t1/kommunikation?communicationId=c1",
            entityType: "COMMUNICATION",
            entityId: "c1",
          },
        },
      ]);
      prismaMocks.notificationDelivery.updateMany.mockResolvedValue({ count: 1 });
      prismaMocks.tenantMembership.findUnique.mockResolvedValue({ isActive: true });
      prismaMocks.pushDeviceRegistration.findMany.mockResolvedValue([
        {
          id: "dev-1",
          userId: "user-1",
          platform: "WEB",
          provider: "WEB_PUSH",
          subscriptionJson: "{}",
          status: "ACTIVE",
        },
      ]);
      prismaMocks.notificationPushDeliveryAttempt.findUnique.mockResolvedValue(null);
      prismaMocks.notificationPushDeliveryAttempt.create.mockResolvedValue({
        id: "att-1",
        status: NotificationDeliveryStatus.PENDING,
      });
      prismaMocks.notificationPushDeliveryAttempt.update.mockResolvedValue({});
      prismaMocks.notificationDelivery.update.mockResolvedValue({});
      prismaMocks.pushDeviceRegistration.updateMany.mockResolvedValue({ count: 1 });

      const summary = await processPendingPushNotificationDeliveries(10);
      expect(summary.failed).toBe(1);
      expect(prismaMocks.pushDeviceRegistration.updateMany).toHaveBeenCalled();
    });
  });

  describe("notification bridge eligibility", () => {
    it("enables push only for team communication notification types", async () => {
      expect(isNotificationTypePushEligible("TEAM_ALERT_PUBLISHED")).toBe(true);
      expect(isNotificationTypePushEligible("TASK_ASSIGNED")).toBe(false);
    });
  });
});

describe("createNotificationIdempotent push channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationServiceMocks.notificationCreate.mockResolvedValue({ id: "n-1" });
    notificationServiceMocks.deliveryCreateMany.mockResolvedValue({ count: 3 });
  });

  it("creates PUSH delivery for team communication notifications", async () => {
    const { createNotificationIdempotent } = await import("@/lib/notifications/notification-service");
    const tx = {
      notification: {
        create: notificationServiceMocks.notificationCreate,
        findUnique: vi.fn(),
      },
      notificationDelivery: { createMany: notificationServiceMocks.deliveryCreateMany },
    };

    await createNotificationIdempotent(tx as never, {
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "TEAM_ANNOUNCEMENT_PUBLISHED",
      title: "Announcement",
      body: "Preview",
      href: "/dashboard/teams/t1/kommunikation?communicationId=c1",
      deduplicationKey: "team-comm:ANNOUNCEMENT:c1:user-1",
      preferences: { inAppEnabled: true, emailEnabled: false, pushEnabled: true },
    });

    expect(notificationServiceMocks.deliveryCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ channel: NotificationChannel.PUSH, status: NotificationDeliveryStatus.PENDING }),
      ]),
      skipDuplicates: true,
    });
  });
});
