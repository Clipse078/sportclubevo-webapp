import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/communication/attachment-authorization", () => ({
  authorizeCommunicationAttachmentAccess: mocks.authorize,
}));
vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.audit }));

import { downloadCommunicationAttachment } from "@/lib/communication/attachment-download-service";

const record = {
  id: "attachment-a",
  tenantId: "tenant-a",
  storageKey: "communication/tenant-a/attachment-a/file.pdf",
  sanitizedFilename: "file.pdf",
  contentType: "application/pdf",
  sizeBytes: 3,
  lifecycleStatus: "READY",
  scanStatus: "PENDING",
  checksumSha256: "abc",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue(record);
  mocks.audit.mockResolvedValue(undefined);
});

describe("communication attachment download service", () => {
  it("streams a legitimately associated tenant attachment without storage internals", async () => {
    const stream = new ReadableStream<Uint8Array>();
    const storage = {
      upload: vi.fn(),
      download: vi.fn().mockResolvedValue({
        stream,
        contentType: "application/pdf",
        sizeBytes: 3,
      }),
      delete: vi.fn(),
    };
    const result = await downloadCommunicationAttachment({
      tenantId: "tenant-a",
      actorUserId: "user-a",
      attachmentId: "attachment-a",
      storage,
    });
    expect(mocks.authorize).toHaveBeenCalled();
    expect(result).toEqual({
      stream,
      filename: "file.pdf",
      contentType: "application/pdf",
      sizeBytes: 3,
      inline: false,
    });
    expect(result).not.toHaveProperty("storageKey");
  });

  it("blocks unauthorized users via authorization layer", async () => {
    mocks.authorize.mockRejectedValue({ code: "FORBIDDEN" });
    await expect(
      downloadCommunicationAttachment({
        tenantId: "tenant-a",
        actorUserId: "outsider",
        attachmentId: "attachment-a",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(["QUARANTINED", "FAILED"])(
    "blocks %s scan state before reading Blob",
    async (scanStatus) => {
      const storage = {
        upload: vi.fn(),
        download: vi.fn(),
        delete: vi.fn(),
      };
      mocks.authorize.mockResolvedValue({ ...record, scanStatus });
      await expect(
        downloadCommunicationAttachment({
          tenantId: "tenant-a",
          actorUserId: "user-a",
          attachmentId: "attachment-a",
          storage,
        }),
      ).rejects.toMatchObject({ code: "ATTACHMENT_UNAVAILABLE" });
      expect(storage.download).not.toHaveBeenCalled();
    },
  );
});
