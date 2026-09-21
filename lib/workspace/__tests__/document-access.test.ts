/**
 * AUFGABEN-06D — Workspace document access seam.
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
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
    },
  },
}));

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

  it("returns readable presentation with href and no storage fields", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    const presentation = await resolveWorkspaceDocumentPresentation(
      ctx([PERMISSIONS.WORKSPACE_VIEW]),
      DOC,
    );
    expect(presentation.access).toBe("readable");
    if (presentation.access === "readable") {
      expect(presentation.title).toBe("Trainershandbuch");
      expect(presentation.href).toBe(`/dashboard/workspace?document=${DOC}`);
      expect(presentation).not.toHaveProperty("storageKey");
      expect(presentation).not.toHaveProperty("storageUrl");
    }
  });

  it("R27 picker default limit is 20 before hard cap", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    await searchWorkspaceDocumentsForTaskLink(ctx([PERMISSIONS.WORKSPACE_VIEW]), "hand");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });

  it("picker excludes archived and respects max limit constant", async () => {
    mocks.findMany.mockResolvedValue([activeDoc()]);
    await searchWorkspaceDocumentsForTaskLink(ctx([PERMISSIONS.WORKSPACE_VIEW]), "hand", 999);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT }),
    );
  });
});
