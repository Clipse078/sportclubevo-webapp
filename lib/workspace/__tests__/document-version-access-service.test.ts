import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceDocumentFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findFirst: mocks.workspaceDocumentFindFirst,
    },
  },
}));

import {
  getWorkspaceDocumentVersionForDownload,
  WorkspaceDocumentVersionAccessError,
} from "@/lib/workspace/document-version-access-service";

describe("getWorkspaceDocumentVersionForDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current version when versionId is omitted", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      name: "Doc",
      currentVersionId: "v2",
      currentVersion: {
        id: "v2",
        documentId: "doc-1",
        versionNumber: 2,
        filename: "a.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
        storageKey: "key-2",
        storageProvider: "vercel-blob",
        checksum: null,
      },
      versions: false,
    });

    const result = await getWorkspaceDocumentVersionForDownload({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
    });

    expect(result?.versionId).toBe("v2");
  });

  it("returns a specific historical version when bound to the document", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      name: "Doc",
      currentVersionId: "v2",
      currentVersion: null,
      versions: [
        {
          id: "v1",
          documentId: "doc-1",
          versionNumber: 1,
          filename: "old.pdf",
          mimeType: "application/pdf",
          sizeBytes: 5,
          storageKey: "key-1",
          storageProvider: "vercel-blob",
          checksum: "abc",
        },
      ],
    });

    const result = await getWorkspaceDocumentVersionForDownload({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
      versionId: "v1",
    });

    expect(result?.versionNumber).toBe(1);
    expect(result?.storageKey).toBe("key-1");
  });

  it("fails closed when requested version is not in document", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      name: "Doc",
      currentVersionId: "v2",
      currentVersion: null,
      versions: [],
    });

    await expect(
      getWorkspaceDocumentVersionForDownload({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        versionId: "missing",
      }),
    ).rejects.toMatchObject({
      code: "VERSION_NOT_FOUND",
    });
  });

  it("rejects explicit empty versionId without falling back to current", async () => {
    await expect(
      getWorkspaceDocumentVersionForDownload({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        versionId: "",
      }),
    ).rejects.toMatchObject({
      code: "VERSION_NOT_FOUND",
    });

    expect(mocks.workspaceDocumentFindFirst).not.toHaveBeenCalled();
  });

  it("rejects empty actor context", async () => {
    await expect(
      getWorkspaceDocumentVersionForDownload({
        tenantId: "tenant-1",
        actorUserId: " ",
        documentId: "doc-1",
      }),
    ).rejects.toBeInstanceOf(WorkspaceDocumentVersionAccessError);
  });
});
