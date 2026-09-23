import {
  WorkspaceDocumentVersionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceDocumentFindFirst: vi.fn(),
  workspaceDocumentVersionFindFirst: vi.fn(),
  transaction: {
    workspaceDocumentVersion: {
      aggregate: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    workspaceDocument: {
      update: vi.fn(),
    },
    workspaceDocumentVersionScan: {
      create: vi.fn(),
    },
  },
  writeAuditRecord: vi.fn(),
  storageDownload: vi.fn(),
  storageUpload: vi.fn(),
  storageDelete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findFirst: mocks.workspaceDocumentFindFirst,
    },
    workspaceDocumentVersion: {
      findFirst: mocks.workspaceDocumentVersionFindFirst,
    },
    $transaction: vi.fn(async (callback: (tx: typeof mocks.transaction) => unknown) =>
      callback(mocks.transaction),
    ),
  },
}));

vi.mock("@/lib/workspace/audit/workspace-audit-write", () => ({
  writeWorkspaceGovernanceAudit: mocks.writeAuditRecord,
}));

vi.mock("@/lib/workspace/storage/workspace-storage-provider-registry", () => ({
  getConfiguredWorkspaceUploadStorageProvider: vi.fn(() => ({
    download: mocks.storageDownload,
    upload: mocks.storageUpload,
    delete: mocks.storageDelete,
  })),
  getWorkspaceStorageProvider: vi.fn(() => ({
    download: mocks.storageDownload,
    upload: mocks.storageUpload,
    delete: mocks.storageDelete,
  })),
}));

import {
  appendWorkspaceDocumentVersion,
  restoreWorkspaceDocumentVersion,
} from "@/lib/workspace/document-version-write-service";

describe("document-version-write-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceDocumentFindFirst.mockResolvedValue({ id: "doc-1" });
    mocks.transaction.workspaceDocumentVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 2 },
    });
    mocks.transaction.workspaceDocumentVersion.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.transaction.workspaceDocumentVersion.create.mockResolvedValue({
      id: "v3",
    });
    mocks.transaction.workspaceDocument.update.mockResolvedValue({
      id: "doc-1",
      tenantId: "tenant-1",
      folderId: null,
      name: "Doc",
      status: "ACTIVE",
      currentVersionId: "v3",
      createdByUserId: "u1",
      updatedByUserId: "u2",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentVersion: {
        id: "v3",
        documentId: "doc-1",
        versionNumber: 3,
        status: WorkspaceDocumentVersionStatus.CURRENT,
        filename: "f.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1,
        storageKey: "key",
        storageUrl: null,
        checksum: null,
        changeNote: null,
        createdByUserId: "u2",
        createdAt: new Date(),
      },
    });
  });

  it("append creates the next version number server-side", async () => {
    await appendWorkspaceDocumentVersion({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
      versionId: "v3",
      filename: "f.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
      storageKey: "key",
    });

    expect(
      mocks.transaction.workspaceDocumentVersion.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 3,
          status: WorkspaceDocumentVersionStatus.CURRENT,
        }),
      }),
    );
    expect(
      mocks.transaction.workspaceDocumentVersion.updateMany,
    ).toHaveBeenCalled();
  });

  it("restore copies storage and appends a new version with provenance", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "old-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 3,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "new-key",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 3,
    });

    await restoreWorkspaceDocumentVersion({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
      sourceVersionId: "v1",
      newVersionId: "v3",
    });

    expect(mocks.storageUpload).toHaveBeenCalled();
    expect(
      mocks.transaction.workspaceDocumentVersion.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeNote: expect.stringContaining("RESTORED_FROM_VERSION:v1"),
        }),
      }),
    );
  });
});
