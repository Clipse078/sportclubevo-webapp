import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@prisma/client";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notificationDelivery: {
      updateMany: mocks.updateMany,
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

vi.mock("../internal-href", () => ({
  buildNotificationAbsoluteHref: (href: string) => `https://app.example.com${href}`,
}));

vi.mock("../email/notification-email-provider", () => ({
  getNotificationEmailProvider: () => ({ send: mocks.send }),
  NotificationEmailProviderError: class NotificationEmailProviderError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

describe("delivery processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findMany.mockResolvedValue([]);
  });

  it("recovers stale PROCESSING deliveries for retry", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 2 });
    const { recoverStaleProcessingDeliveries } = await import("../delivery-processor");
    const recovered = await recoverStaleProcessingDeliveries(
      new Date("2026-09-21T12:00:00.000Z"),
    );
    expect(recovered).toBe(2);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.PROCESSING,
        }),
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.FAILED,
          failureCode: "PROCESSING_LEASE_EXPIRED",
        }),
      }),
    );
  });

  it("claims a delivery only when status and attemptCount still match", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "d-1",
        status: NotificationDeliveryStatus.PENDING,
        attemptCount: 0,
        notificationId: "n-1",
        notification: {
          href: "/dashboard/aufgaben/t1",
          title: "T",
          body: "B",
          tenantId: "tenant-1",
          recipient: { email: "user@example.com" },
          tenant: { name: "Club A", locale: "de-CH", timezone: "Europe/Zurich" },
        },
      },
    ]);
    mocks.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    mocks.send.mockResolvedValue({ providerMessageId: "resend-1", from: "noreply@example.com" });
    mocks.update.mockResolvedValue({});

    process.env.APP_BASE_URL = "https://app.example.com";
    const { processPendingNotificationDeliveries } = await import("../delivery-processor");
    const summary = await processPendingNotificationDeliveries(10);
    expect(summary.claimed).toBe(1);
    expect(summary.sent).toBe(1);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "notification-email:d-1",
        to: "user@example.com",
      }),
    );
  });

  it("skips email delivery when recipient has no email", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "d-2",
        status: NotificationDeliveryStatus.PENDING,
        attemptCount: 0,
        notificationId: "n-2",
        notification: {
          href: "/dashboard/aufgaben/t2",
          title: "T",
          body: "B",
          tenantId: "tenant-1",
          recipient: { email: "" },
          tenant: { name: "Club A", locale: "de-CH", timezone: "Europe/Zurich" },
        },
      },
    ]);
    mocks.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    mocks.update.mockResolvedValue({});

    const { processPendingNotificationDeliveries } = await import("../delivery-processor");
    const summary = await processPendingNotificationDeliveries(10);
    expect(summary.skipped).toBe(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
