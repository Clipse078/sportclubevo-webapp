import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceApiActor: vi.fn(),
  assertWorkspaceDocumentReadWithOptionalBreakGlass: vi.fn(),
  getTenantFromSession: vi.fn(),
  getDocument: vi.fn(),
  download: vi.fn(),
}));

vi.mock("@/lib/workspace/workspace-api-actor", () => ({
  requireWorkspaceApiActor: mocks.requireWorkspaceApiActor,
}));

vi.mock("@/lib/workspace/governance/workspace-governance-read-authorization", () => ({
  assertWorkspaceDocumentReadWithOptionalBreakGlass: (...args: unknown[]) =>
    mocks.assertWorkspaceDocumentReadWithOptionalBreakGlass(...args),
}));

vi.mock("@/lib/tenants/queries", () => ({
  getTenantFromSession: mocks.getTenantFromSession,
}));

vi.mock("@/lib/workspace/document-version-access-service", () => ({
  WorkspaceDocumentVersionAccessError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  getWorkspaceDocumentVersionForDownload: mocks.getDocument,
}));

vi.mock("@/lib/workspace/upload-storage", () => ({
  getWorkspaceStorageProvider: vi.fn(() => ({
    download: mocks.download,
  })),
}));

vi.mock("@/lib/workspace/malware-scan/content-delivery-gate", () => ({
  assertWorkspaceVersionSafeForDelivery: vi.fn().mockResolvedValue({
    scanState: "CLEAN",
  }),
  WorkspaceContentDeliveryBlockedError: class WorkspaceContentDeliveryBlockedError extends Error {},
}));

import { createMockWorkspaceApiActorSuccess } from "@/lib/test/mock-workspace-api-actor";
import { GET } from "@/app/api/workspace/documents/[documentId]/preview/route";

describe("Workspace private preview security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceApiActor.mockResolvedValue(
      createMockWorkspaceApiActorSuccess({
        tenantId: "tenant-a",
        userId: "user-a",
        viewableDocumentIds: ["document-a"],
      }),
    );
    mocks.getTenantFromSession.mockResolvedValue({
      id: "tenant-a",
      key: "tenant-a",
    });
    mocks.getDocument.mockResolvedValue({
      documentId: "document-a",
      versionId: "version-a",
      filename: "private.png",
      mimeType: "image/png",
      sizeBytes: 3,
      storageKey:
        "workspace/tenant-a/document-a/v1/private.png",
      storageProvider: "vercel-blob",
      checksum: null,
    });
    mocks.download.mockResolvedValue({
      ok: true,
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      filename: "private.png",
      contentType: "image/png",
      contentDisposition: 'attachment; filename="private.png"',
      sizeBytes: 3,
      etag: "etag-a",
    });
  });

  it("uses the session tenant and prevents private response caching", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/workspace/documents/document-a/preview",
      ),
      { params: Promise.resolve({ documentId: "document-a" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store",
    );
    expect(mocks.getDocument).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      actorUserId: "user-a",
      documentId: "document-a",
      versionId: null,
    });
    expect(mocks.download).toHaveBeenCalledWith({
      storageReference:
        "workspace/tenant-a/document-a/v1/private.png",
      filename: "private.png",
      mimeType: "image/png",
    });
  });

  it("does not touch storage for a foreign or missing document ID", async () => {
    mocks.getDocument.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/workspace/documents/document-b/preview",
      ),
      { params: Promise.resolve({ documentId: "document-b" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
