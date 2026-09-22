/**
 * AUFGABEN-06D / WORKSPACE-02 — Workspace document access seam.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceDocumentStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT,
  canReadWorkspaceDocument,
  filterReadableWorkspaceDocumentIds,
  resolveWorkspaceDocumentPresentation,
  searchWorkspaceDocumentsForTaskLink,
} from "../document-access";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  resolveActor: vi.fn(),
  buildReadWhere: vi.fn(),
  canWorkspaceView: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("@/lib/workspace/access/actor-context", () => ({
  resolveWorkspaceActorFromSessionUser: (...args: unknown[]) =>
    mocks.resolveActor(...args),
}));

vi.mock("@/lib/workspace/access/query-predicate", () => ({
  buildWorkspaceReadWhere: (...args: unknown[]) => mocks.buildReadWhere(...args),
}));

vi.mock("@/lib/workspace/access/workspace-authorization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/workspace/access/workspace-authorization")>();
  return {
    ...actual,
    canWorkspaceView: (...args: unknown[]) => mocks.canWorkspaceView(...args),
  };
});

const TENANT = "tenant-a";
const DOC = "doc-1";

function ctx(permissionKeys: string[]) {
  return { tenantId: TENANT, userId: "user-1", permissionKeys };
}

function activeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC,
    tenantId: TENANT,
    name: "Trainershandbuch",
    status: WorkspaceDocumentStatus.ACTIVE,
    archivedAt: null,
    folder: { name: "Verein" },
    ...overrides,
  };
}

describe("document-access seam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveActor.mockResolvedValue({ identity: { tenantId: TENANT } });
    mocks.buildReadWhere.mockResolvedValue({
      documentWhere: { tenantId: TENANT, id: { in: [DOC] } },
    });
    mocks.canWorkspaceView.mockReturnValue(true);
  });

  it("requires workspace.view for readable documents", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    const readable = await filterReadableWorkspaceDocumentIds(ctx([PERMISSIONS.TASKS_VIEW]), [DOC]);
    expect(readable.size).toBe(0);
  });

  it("allows ACTIVE non-archived same-tenant documents with workspace.view", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    expect(await canReadWorkspaceDocument(ctx([PERMISSIONS.WORKSPACE_VIEW]), DOC)).toBe(true);
  });

  it("rejects archived documents for new reads", async () => {
    mocks.findMany.mockResolvedValue([
      activeDoc({ archivedAt: new Date("2026-01-01T00:00:00.000Z") }),
    ]);
    expect(await canReadWorkspaceDocument(ctx([PERMISSIONS.WORKSPACE_VIEW]), DOC)).toBe(false);
  });

  it("returns restricted presentation without title metadata", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    const presentation = await resolveWorkspaceDocumentPresentation(
      ctx([PERMISSIONS.TASKS_VIEW]),
      DOC,
    );
    expect(presentation).toEqual({ access: "restricted", documentId: DOC });
  });

  it("search uses query-boundary read predicate", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    await searchWorkspaceDocumentsForTaskLink(ctx([PERMISSIONS.WORKSPACE_VIEW]), "hand");
    expect(mocks.buildReadWhere).toHaveBeenCalled();
  });

  it("search respects picker limit cap", async () => {
    mocks.findMany.mockResolvedValue([]);
    await searchWorkspaceDocumentsForTaskLink(ctx([PERMISSIONS.WORKSPACE_VIEW]), "hand", 999);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT,
      }),
    );
  });

  it("denies when resource ACL rejects view", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    mocks.canWorkspaceView.mockReturnValue(false);
    expect(await canReadWorkspaceDocument(ctx([PERMISSIONS.WORKSPACE_VIEW]), DOC)).toBe(false);
  });
});
