import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateCommunicationAttachment } from "@/lib/communication/attachment-validation";
import { toPublicCommunicationAttachment } from "@/lib/communication/attachment-public-dto";
import { isCommunicationAttachmentPreviewSupported } from "@/lib/communication/attachment-preview-policy";

const authMocks = vi.hoisted(() => ({
  membership: vi.fn(),
  attachment: vi.fn(),
  resolver: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: authMocks.membership },
    communicationAttachment: { findFirst: authMocks.attachment },
    tenant: { findFirst: vi.fn().mockResolvedValue({ key: "tenant-a" }) },
    communicationMessage: { findFirst: vi.fn().mockResolvedValue({ id: "msg-a" }) },
    communicationCenterMessage: { findFirst: vi.fn().mockResolvedValue(null) },
    platformCommunication: { findFirst: vi.fn().mockResolvedValue(null) },
    platformCommunicationRecipientSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: authMocks.resolver,
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn().mockResolvedValue(false),
  isTenantClubAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: vi.fn() }));

import { authorizeCommunicationAttachmentAccess } from "@/lib/communication/attachment-authorization";
import { assertOutboundAttachmentOwnership } from "@/lib/communication/attachment-authorization";

describe("SCE-COMM-EVO-04 unified attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.membership.mockResolvedValue({ id: "m1" });
    authMocks.resolver.mockResolvedValue({
      tenant: ["registrations.view", "registrations.edit"],
    });
  });

  it("rejects dangerous executable extensions", async () => {
    await expect(
      validateCommunicationAttachment({
        filename: "virus.exe",
        declaredContentType: "application/octet-stream",
        buffer: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({ code: "TYPE_NOT_ALLOWED" });
  });

  it("accepts PDF when signature matches", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const validated = await validateCommunicationAttachment({
      filename: "info.pdf",
      declaredContentType: "application/pdf",
      buffer: pdf,
    });
    expect(validated.contentType).toBe("application/pdf");
  });

  it("never exposes storageKey in public DTO", () => {
    const dto = toPublicCommunicationAttachment({
      id: "att-1",
      filename: "file.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      lifecycleStatus: "READY",
      scanStatus: "PENDING",
    });
    expect(dto).not.toHaveProperty("storageKey");
    expect(dto.downloadAvailable).toBe(true);
    expect(dto.previewAvailable).toBe(true);
  });

  it("blocks unauthorized attachment access (IDOR)", async () => {
    authMocks.attachment.mockResolvedValue({
      id: "att-x",
      tenantId: "tenant-a",
      storageKey: "secret/key",
      sanitizedFilename: "secret.pdf",
      contentType: "application/pdf",
      sizeBytes: 3,
      lifecycleStatus: "READY",
      scanStatus: "PENDING",
      checksumSha256: "abc",
      messageLinks: [],
      communicationCenterMessageLinks: [],
      platformCommunicationLinks: [{ communicationId: "comm-1" }],
    });
    authMocks.resolver.mockResolvedValue({ tenant: [] });
    await expect(
      authorizeCommunicationAttachmentAccess({
        tenantId: "tenant-a",
        tenantKey: "tenant-a",
        actorUserId: "user-b",
        attachmentId: "att-x",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects cross-user staged attachment reuse", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    Object.assign(prisma.communicationAttachment, {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "att-other",
          createdByUserId: "user-b",
          messageLinks: [],
          communicationCenterMessageLinks: [],
          platformCommunicationLinks: [],
        },
      ]),
    });

    await expect(
      assertOutboundAttachmentOwnership({
        tenantId: "tenant-a",
        actorUserId: "user-a",
        attachmentIds: ["att-other"],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("marks legacy inbound placeholders unavailable", () => {
    const dto = toPublicCommunicationAttachment({
      id: "legacy",
      filename: "old.pdf",
      contentType: "application/pdf",
      sizeBytes: 10,
      lifecycleStatus: "STAGED",
      scanStatus: "PENDING",
      bytesAvailable: false,
    });
    expect(dto.downloadAvailable).toBe(false);
    expect(dto.unavailableReason).toBe("Datei nicht verfügbar");
  });

  it("allows image preview policy for PNG", () => {
    expect(isCommunicationAttachmentPreviewSupported("image/png")).toBe(true);
    expect(isCommunicationAttachmentPreviewSupported("text/html")).toBe(false);
  });
});
