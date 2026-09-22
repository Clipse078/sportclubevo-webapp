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
  archiveWorkspaceDocument: vi.fn(),
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

vi.mock(
  "@/lib/workspace/document-archive-service",
  () => {
    type ErrorCode =
      | "INVALID_INPUT"
      | "DOCUMENT_NOT_FOUND"
      | "TENANT_FORBIDDEN"
      | "DOCUMENT_ALREADY_ARCHIVED";

    class WorkspaceDocumentArchiveServiceError extends Error {
      readonly code: ErrorCode;

      constructor(code: ErrorCode, message: string) {
        super(message);
        this.name =
          "WorkspaceDocumentArchiveServiceError";
        this.code = code;
      }
    }

    return {
      archiveWorkspaceDocument:
        mocks.archiveWorkspaceDocument,
      WorkspaceDocumentArchiveServiceError,
    };
  },
);

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { POST } from "@/app/api/workspace/documents/[documentId]/archive/route";
import { WorkspaceDocumentArchiveServiceError } from "@/lib/workspace/document-archive-service";

const SESSION_TENANT_ID = "tenant-session";
const TENANT_ID = "tenant-1";
const DOCUMENT_ID = "document-1";
const USER_ID = "user-1";

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
    `http://localhost/api/workspace/documents/${DOCUMENT_ID}/archive`,
    {
      method: "POST",
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
  "POST /api/workspace/documents/[documentId]/archive",
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
        key: "fc-allschwil",
      });

      mocks.archiveWorkspaceDocument.mockResolvedValue({
        documentId: DOCUMENT_ID,
        status: "ARCHIVED",
        archivedAt: new Date(
          "2026-07-19T10:00:00.000Z",
        ),
        updatedByUserId: USER_ID,
      });
    });

    it("requires WORKSPACE_MANAGE", async () => {
      mocks.requireWorkspaceApiActor.mockResolvedValue({
        ok: false,
        status: 403,
        error: "Forbidden",
        session: null,
      });

      const response = await POST(
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
        PERMISSIONS.WORKSPACE_MANAGE,
      );

      expect(
        mocks.archiveWorkspaceDocument,
      ).not.toHaveBeenCalled();
    });

    it("returns 200 after archiving the document", async () => {
      const response = await POST(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
      });

      expect(
        mocks.archiveWorkspaceDocument,
      ).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        actorUserId: USER_ID,
        documentId: DOCUMENT_ID,
      });
    });

    it.each([
      ["TENANT_FORBIDDEN", 403],
      ["DOCUMENT_NOT_FOUND", 404],
      ["DOCUMENT_ALREADY_ARCHIVED", 409],
    ] as const)(
      "maps %s to HTTP %s",
      async (code, expectedStatus) => {
        mocks.archiveWorkspaceDocument.mockRejectedValue(
          new WorkspaceDocumentArchiveServiceError(
            code,
            "Archive failure.",
          ),
        );

        const response = await POST(
          makeRequest(),
          makeParams(),
        );

        expect(response.status).toBe(expectedStatus);
        await expect(response.json()).resolves.toEqual({
          error: "Archive failure.",
          code,
        });
      },
    );

    it("returns 403 when the session has no tenant", async () => {
      mockAuthorizedSession(null);

      const response = await POST(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(403);

      expect(
        mocks.getTenantFromSession,
      ).not.toHaveBeenCalled();

      expect(
        mocks.archiveWorkspaceDocument,
      ).not.toHaveBeenCalled();
    });

    it("returns 401 when the session has no actor ID", async () => {
      mockAuthorizedSession(
        SESSION_TENANT_ID,
        null,
      );

      const response = await POST(
        makeRequest(),
        makeParams(),
      );

      expect(response.status).toBe(401);

      expect(
        mocks.archiveWorkspaceDocument,
      ).not.toHaveBeenCalled();
    });
  },
);
