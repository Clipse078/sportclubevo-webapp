import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  storageDelete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    communicationAttachment: {
      findMany: mocks.findMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

const { runStaleUnlinkedCommunicationAttachmentCleanup } = await import(
  "../attachment-cleanup-service"
);

describe("communication attachment cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageDelete.mockResolvedValue(undefined);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("removes stale unlinked READY attachments after storage delete", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "att-1",
        tenantId: "tenant-a",
        storageKey: "communication/tenant-a/att-1/file.pdf",
        lifecycleStatus: "READY",
        _count: {
          messageLinks: 0,
          platformCommunicationLinks: 0,
          communicationCenterMessageLinks: 0,
          personalSignatureAssetLinks: 0,
        },
      },
    ]);

    const summary = await runStaleUnlinkedCommunicationAttachmentCleanup({
      now: new Date("2026-09-28T12:00:00.000Z"),
      storage: { delete: mocks.storageDelete },
    });

    expect(mocks.storageDelete).toHaveBeenCalledWith(
      "communication/tenant-a/att-1/file.pdf",
    );
    expect(mocks.deleteMany).toHaveBeenCalled();
    expect(summary.removed).toBe(1);
  });

  it("skips rows that gained links between list and delete", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "att-linked",
        tenantId: "tenant-a",
        storageKey: "key",
        lifecycleStatus: "READY",
        _count: {
          messageLinks: 0,
          platformCommunicationLinks: 0,
          communicationCenterMessageLinks: 0,
          personalSignatureAssetLinks: 0,
        },
      },
    ]);
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    const summary = await runStaleUnlinkedCommunicationAttachmentCleanup({
      now: new Date("2026-09-28T12:00:00.000Z"),
      storage: { delete: mocks.storageDelete },
    });

    expect(summary.removed).toBe(0);
    expect(summary.skippedLinked).toBe(1);
  });

  it("does not delete metadata when storage delete fails", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "att-2",
        tenantId: "tenant-a",
        storageKey: "key-2",
        lifecycleStatus: "READY",
        _count: {
          messageLinks: 0,
          platformCommunicationLinks: 0,
          communicationCenterMessageLinks: 0,
          personalSignatureAssetLinks: 0,
        },
      },
    ]);
    mocks.storageDelete.mockRejectedValue(new Error("blob missing"));

    const summary = await runStaleUnlinkedCommunicationAttachmentCleanup({
      now: new Date("2026-09-28T12:00:00.000Z"),
      storage: { delete: mocks.storageDelete },
    });

    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(summary.storageFailures).toBe(1);
  });
});
