import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  delete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("../billing-communication-attachment-repository", () => ({
  listStaleStagedBillingCommunicationAttachments: vi.fn(),
  deleteStagedBillingCommunicationAttachmentById: vi.fn(),
}));

vi.mock("../billing-communication-attachment-storage", () => ({
  billingCommunicationAttachmentStorage: storageMock,
}));

const repo = await import("../billing-communication-attachment-repository");
const { runStaleStagedBillingCommunicationAttachmentCleanup } = await import(
  "../billing-communication-attachment-cleanup-service"
);

describe("billing communication attachment cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.delete.mockResolvedValue(undefined);
  });

  it("removes stale STAGED attachments after storage delete", async () => {
    vi.mocked(repo.listStaleStagedBillingCommunicationAttachments).mockResolvedValue([
      {
        id: "a1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        billingCommunicationId: null,
        storageKey: "key-1",
        originalFilename: "f.pdf",
        sanitizedFilename: "f.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        checksumSha256: "abc",
        contentDisposition: null,
        providerContentId: null,
        sortOrder: 0,
        lifecycleStatus: "STAGED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(repo.deleteStagedBillingCommunicationAttachmentById).mockResolvedValue({
      id: "a1",
    } as never);

    const summary = await runStaleStagedBillingCommunicationAttachmentCleanup({
      storage: storageMock as never,
    });

    expect(storageMock.delete).toHaveBeenCalledWith("key-1");
    expect(summary.removed).toBe(1);
  });

  it("never deletes metadata when storage delete fails", async () => {
    vi.mocked(repo.listStaleStagedBillingCommunicationAttachments).mockResolvedValue([
      {
        id: "a2",
        tenantId: "tenant-1",
        invoiceId: null,
        billingCommunicationId: null,
        storageKey: "key-2",
        originalFilename: "f.pdf",
        sanitizedFilename: "f.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        checksumSha256: "abc",
        contentDisposition: null,
        providerContentId: null,
        sortOrder: 0,
        lifecycleStatus: "STAGED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    storageMock.delete.mockRejectedValue(new Error("storage down"));

    const summary = await runStaleStagedBillingCommunicationAttachmentCleanup({
      storage: storageMock as never,
    });

    expect(repo.deleteStagedBillingCommunicationAttachmentById).not.toHaveBeenCalled();
    expect(summary.storageFailures).toBe(1);
  });

  it("is idempotent when metadata row already gone", async () => {
    vi.mocked(repo.listStaleStagedBillingCommunicationAttachments).mockResolvedValue([
      {
        id: "a3",
        tenantId: "tenant-1",
        invoiceId: null,
        billingCommunicationId: null,
        storageKey: "key-3",
        originalFilename: "f.pdf",
        sanitizedFilename: "f.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        checksumSha256: "abc",
        contentDisposition: null,
        providerContentId: null,
        sortOrder: 0,
        lifecycleStatus: "STAGED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(repo.deleteStagedBillingCommunicationAttachmentById).mockResolvedValue(null);

    const summary = await runStaleStagedBillingCommunicationAttachmentCleanup({
      storage: storageMock as never,
    });

    expect(summary.removed).toBe(0);
    expect(summary.skippedNotStaged).toBe(1);
  });
});
