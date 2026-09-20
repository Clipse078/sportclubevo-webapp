import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  notificationFindUnique: vi.fn(),
  deliveryCreateMany: vi.fn(),
}));

describe("createNotificationIdempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("creates notification and channel deliveries", async () => {
    mocks.notificationCreate.mockResolvedValue({ id: "n-1" });
    mocks.deliveryCreateMany.mockResolvedValue({ count: 2 });

    vi.doMock("@/lib/db/prisma", () => ({ prisma: {} }));
    const { createNotificationIdempotent } = await import("../notification-service");

    const tx = {
      notification: {
        create: mocks.notificationCreate,
        findUnique: mocks.notificationFindUnique,
      },
      notificationDelivery: {
        createMany: mocks.deliveryCreateMany,
      },
    };

    const result = await createNotificationIdempotent(tx as never, {
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "TASK_ASSIGNED",
      title: "Neue Aufgabe",
      body: "Body",
      href: "/dashboard/aufgaben/t1",
      deduplicationKey: "key-1",
      preferences: { inAppEnabled: true, emailEnabled: true },
    });

    expect(result?.kind).toBe("CREATED");
    expect(mocks.deliveryCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          channel: NotificationChannel.IN_APP,
          status: NotificationDeliveryStatus.SENT,
        }),
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.PENDING,
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it("N55/N13 — unique constraint returns DEDUPLICATED without second notification row", async () => {
    const uniqueError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mocks.notificationCreate
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce({ id: "n-existing" });
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-existing" });

    vi.doMock("@/lib/db/prisma", () => ({ prisma: {} }));
    const { createNotificationIdempotent } = await import("../notification-service");

    const tx = {
      notification: {
        create: mocks.notificationCreate,
        findUnique: mocks.notificationFindUnique,
      },
      notificationDelivery: {
        createMany: mocks.deliveryCreateMany,
      },
    };

    const result = await createNotificationIdempotent(tx as never, {
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "PARTICIPATION_REMINDER",
      title: "Teilnahme",
      body: "Body",
      href: "/dashboard/aufgaben?bereich=meine",
      deduplicationKey: "participation-reminder:dup",
      preferences: { inAppEnabled: true, emailEnabled: true },
    });

    expect(result?.kind).toBe("DEDUPLICATED");
    expect(mocks.deliveryCreateMany).not.toHaveBeenCalled();
  });

  it("A1-CONCURRENT — parallel idempotent creates surface dedup on conflict", async () => {
    const uniqueError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mocks.notificationCreate.mockImplementation(async () => {
      throw uniqueError;
    });
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-existing" });

    vi.doMock("@/lib/db/prisma", () => ({ prisma: {} }));
    const { createNotificationIdempotent } = await import("../notification-service");

    const tx = {
      notification: {
        create: mocks.notificationCreate,
        findUnique: mocks.notificationFindUnique,
      },
      notificationDelivery: {
        createMany: mocks.deliveryCreateMany,
      },
    };

    const input = {
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "PARTICIPATION_REMINDER" as const,
      title: "Teilnahme",
      body: "Body",
      href: "/dashboard/aufgaben?bereich=meine",
      deduplicationKey: "participation-reminder:race",
      preferences: { inAppEnabled: true, emailEnabled: true },
    };

    const results = await Promise.all([
      createNotificationIdempotent(tx as never, input),
      createNotificationIdempotent(tx as never, input),
    ]);
    const kinds = results.map((r) => r?.kind).sort();
    expect(kinds).toEqual(["CREATED", "DEDUPLICATED"]);
    expect(mocks.deliveryCreateMany).toHaveBeenCalledTimes(1);
  });
});
