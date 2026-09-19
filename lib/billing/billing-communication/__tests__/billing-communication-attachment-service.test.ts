import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

const storageMock = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    billingCommunicationAttachment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    billingInboundUnresolvedAttachment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    billingCommunication: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("../billing-communication-attachment-storage", () => ({
  billingCommunicationAttachmentStorage: storageMock,
  getBillingCommunicationAttachmentStorageKey: vi.fn(
    () => "billing-communication/tenant/att/file.pdf",
  ),
  getBillingInboundUnresolvedAttachmentStorageKey: vi.fn(
    () => "billing-inbound-unresolved/unresolved/att/file.pdf",
  ),
}));

const { prisma } = await import("@/lib/db/prisma");
const {
  filterOperatorVisibleInboundAttachments,
  stageOutboundBillingCommunicationAttachment,
  resolveStagedAttachmentsForSend,
} = await import("../billing-communication-attachment-service");

async function pdfBuffer(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  return new Uint8Array(await doc.save());
}

describe("billing communication attachment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.upload.mockResolvedValue({
      storageKey: "billing-communication/tenant/att/file.pdf",
      checksumSha256: "abc",
      sizeBytes: 100,
    });
  });

  it("filters inline CID assets from operator-visible attachments", () => {
    const visible = filterOperatorVisibleInboundAttachments([
      {
        filename: "logo.png",
        contentType: "image/png",
        buffer: new Uint8Array([1, 2, 3]),
        contentDisposition: "inline",
        providerContentId: "logo@sig",
        isInline: true,
      },
      {
        filename: "beleg.pdf",
        contentType: "application/pdf",
        buffer: new Uint8Array([1, 2, 3]),
        contentDisposition: "attachment",
        providerContentId: null,
        isInline: false,
      },
    ]);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.filename).toBe("beleg.pdf");
  });

  it("stages outbound attachments with server-generated storage key", async () => {
    vi.mocked(prisma.billingCommunicationAttachment.create).mockResolvedValue({
      id: "att-1",
      tenantId: "tenant-a",
      invoiceId: "inv-1",
      billingCommunicationId: null,
      storageKey: "billing-communication/tenant/att/file.pdf",
      originalFilename: "rechnung.pdf",
      sanitizedFilename: "rechnung.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      checksumSha256: "abc",
      contentDisposition: "attachment",
      providerContentId: null,
      sortOrder: 0,
      lifecycleStatus: "STAGED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buffer = await pdfBuffer();
    const row = await stageOutboundBillingCommunicationAttachment({
      tenantId: "tenant-a",
      invoiceId: "inv-1",
      filename: "rechnung.pdf",
      declaredContentType: "application/pdf",
      buffer,
      storage: storageMock,
    });

    expect(row.lifecycleStatus).toBe("STAGED");
    expect(storageMock.upload).toHaveBeenCalledTimes(1);
  });

  it("rejects staged attachment ids outside invoice scope", async () => {
    vi.mocked(prisma.billingCommunicationAttachment.findMany).mockResolvedValue([]);
    await expect(
      resolveStagedAttachmentsForSend({
        tenantId: "tenant-a",
        invoiceId: "inv-1",
        attachmentIds: ["missing"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
