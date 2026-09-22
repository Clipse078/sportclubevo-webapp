import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceApiActor: vi.fn(),
  buildWorkspaceReadWhere: vi.fn(),
  assertWorkspaceAccess: vi.fn(),
  getTenantFromSession: vi.fn(),
  getDocumentForDownload: vi.fn(),
  download: vi.fn(),
}));

vi.mock("@/lib/workspace/workspace-api-actor", () => ({
  requireWorkspaceApiActor: mocks.requireWorkspaceApiActor,
}));

vi.mock("@/lib/workspace/access/query-predicate", () => ({
  buildWorkspaceReadWhere: mocks.buildWorkspaceReadWhere,
}));

vi.mock("@/lib/workspace/access/workspace-authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/access/workspace-authorization")>();
  return {
    ...actual,
    assertWorkspaceAccess: (...args: unknown[]) => mocks.assertWorkspaceAccess(...args),
  };
});

vi.mock("@/lib/tenants/queries", () => ({
  getTenantFromSession: mocks.getTenantFromSession,
}));

vi.mock("@/lib/workspace/document-service", () => {
  type WorkspaceDocumentServiceErrorCode =
    | "INVALID_INPUT"
    | "FOLDER_NOT_FOUND"
    | "DUPLICATE_DOCUMENT_NAME";

  class WorkspaceDocumentServiceError extends Error {
    readonly code: WorkspaceDocumentServiceErrorCode;

    constructor(
      code: WorkspaceDocumentServiceErrorCode,
      message: string,
    ) {
      super(message);
      this.name = "WorkspaceDocumentServiceError";
      this.code = code;
    }
  }

  return {
    WorkspaceDocumentServiceError,
    getWorkspaceDocumentForDownload:
      mocks.getDocumentForDownload,
  };
});

vi.mock("@/lib/workspace/upload-storage", () => ({
  workspaceStorageProvider: {
    download: mocks.download,
  },
}));

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { GET } from "@/app/api/workspace/documents/[documentId]/download/route";

const SESSION_TENANT_ID = "tenant-session";
const ACTOR_USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const TENANT_KEY = "fc-allschwil";
const DOCUMENT_ID = "1234567890abcdef1234567890abcdef";
const STORAGE_KEY =
  "workspace/fc-allschwil/1234567890abcdef1234567890abcdef/v1/Trainer-Handbuch.pdf";

const downloadableDocument = {
  documentId: DOCUMENT_ID,
  documentName: "Trainer-Handbuch",
  versionId: "version-1",
  versionNumber: 1,
  filename: "Trainer-Handbuch.pdf",
  mimeType: "application/pdf",
  sizeBytes: 16,
  storageKey: STORAGE_KEY,
  checksum:
    "1111111111111111111111111111111111111111111111111111111111111111",
};

function mockAuthorizedSession(
  overrides: {
    tenantId?: string | null;
    userId?: string | null;
  } = {},
) {
  const tenantId =
    overrides.tenantId === undefined
      ? SESSION_TENANT_ID
      : overrides.tenantId;
  const userId =
    overrides.userId === undefined ? ACTOR_USER_ID : overrides.userId;

  if (!tenantId || !userId) {
    mocks.requireWorkspaceApiActor.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Authenticated tenant and user are required.",
      session: {
        user: {
          id: userId,
          activeTenantId: tenantId,
        },
      },
    });
    return;
  }

  mocks.requireWorkspaceApiActor.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: {
      user: {
        id: userId,
        activeTenantId: tenantId,
      },
    },
    tenantId,
    actorUserId: userId,
    actor: {
      identity: {
        tenantId,
        userId,
        personId: null,
      },
    },
  });
}


function makeRequest(): Request {
  return new Request(
    `http://localhost/api/workspace/documents/${DOCUMENT_ID}/download`,
    {
      method: "GET",
    },
  );
}

function makeParams() {
  return {
    params: Promise.resolve({
      documentId: DOCUMENT_ID,
    }),
  };
}

describe(
  "GET /api/workspace/documents/[documentId]/download",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockAuthorizedSession();

    mocks.buildWorkspaceReadWhere.mockResolvedValue({
      folderIds: ["folder-1"],
      documentIds: ["document-1", "doc-1"],
      folderWhere: {},
      documentWhere: {},
    });

      mocks.getTenantFromSession.mockResolvedValue({
        id: TENANT_ID,
        key: TENANT_KEY,
      });

      mocks.getDocumentForDownload.mockResolvedValue(
        downloadableDocument,
      );
    });

    it("requires WORKSPACE_VIEW before resolving the tenant", async () => {
      mocks.requireWorkspaceApiActor.mockResolvedValue({
        ok: false,
        status: 403,
        error: "Forbidden",
        session: null,
      });

      const response = await GET(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Forbidden",
      });

      expect(
        mocks.requireWorkspaceApiActor,
      ).toHaveBeenCalledWith(
        PERMISSIONS.WORKSPACE_VIEW,
      );

      expect(
        mocks.getTenantFromSession,
      ).not.toHaveBeenCalled();

      expect(
        mocks.getDocumentForDownload,
      ).not.toHaveBeenCalled();

      expect(mocks.download).not.toHaveBeenCalled();
    });

    it("returns 403 when the session has no tenant", async () => {
      mockAuthorizedSession(null);

      const response = await GET(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Authenticated tenant and user are required.",
      });

      expect(
        mocks.getTenantFromSession,
      ).not.toHaveBeenCalled();

      expect(
        mocks.getDocumentForDownload,
      ).not.toHaveBeenCalled();

      expect(mocks.download).not.toHaveBeenCalled();
    });

    it("returns 404 when the document is unavailable", async () => {
      mocks.getDocumentForDownload.mockResolvedValue(null);

      const response = await GET(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "Dokument nicht gefunden.",
      });

      expect(
        mocks.getDocumentForDownload,
      ).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        documentId: DOCUMENT_ID,
      });

      expect(mocks.download).not.toHaveBeenCalled();
    });

    it("returns the storage-provider failure", async () => {
      mocks.download.mockResolvedValue({
        ok: false,
        status: 404,
        error: "Datei nicht gefunden.",
      });

      const response = await GET(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "Datei nicht gefunden.",
      });

      expect(mocks.download).toHaveBeenCalledWith({
        storageReference: STORAGE_KEY,
        filename: downloadableDocument.filename,
        mimeType: downloadableDocument.mimeType,
      });
    });

    it("streams the file with download headers", async () => {
      const content = new TextEncoder().encode(
        "document-content",
      );

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(content);
          controller.close();
        },
      });

      mocks.download.mockResolvedValue({
        ok: true,
        stream,
        filename: downloadableDocument.filename,
        contentType: "application/pdf",
        contentDisposition:
          'attachment; filename="Trainer-Handbuch.pdf"',
        sizeBytes: content.byteLength,
        etag: '"download-etag"',
      });

      const response = await GET(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(
        "document-content",
      );

      expect(response.headers.get("content-type")).toBe(
        "application/pdf",
      );

      expect(
        response.headers.get("content-disposition"),
      ).toBe(
        'attachment; filename="Trainer-Handbuch.pdf"',
      );

      expect(
        response.headers.get("content-length"),
      ).toBe(String(content.byteLength));

      expect(response.headers.get("etag")).toBe(
        '"download-etag"',
      );

      expect(response.headers.get("cache-control")).toBe(
        "private, no-store",
      );

      expect(
        response.headers.get("x-content-type-options"),
      ).toBe("nosniff");

      expect(mocks.download).toHaveBeenCalledWith({
        storageReference: STORAGE_KEY,
        filename: downloadableDocument.filename,
        mimeType: downloadableDocument.mimeType,
      });
    });
  },
);
