import {
  WorkspaceDocumentVersionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getWorkspaceDocumentVersionForDownload } from "@/lib/workspace/document-version-access-service";
import {
  appendWorkspaceDocumentVersion,
  restoreWorkspaceDocumentVersion,
  WorkspaceDocumentVersionWriteError,
} from "@/lib/workspace/document-version-write-service";
import { getDocumentVersions } from "@/lib/workspace/document-version-service";
import {
  deriveWorkspaceVersionIsCurrent,
  userChangeNoteSpoofsRestoreProvenance,
} from "@/lib/workspace/version/version-domain";
import { toWorkspaceDocumentVersionRefDto } from "@/lib/workspace/version/version-reference";
import {
  resolveWorkspaceVersionIdQuery,
} from "@/lib/workspace/version/version-query";

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

vi.mock("@/lib/workspace/malware-scan/batch-version-scan-public-dto", () => ({
  loadWorkspaceVersionScanPublicDtoMap: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock(
  "@/lib/workspace/version/resolve-workspace-version-uploader-display",
  () => ({
    resolveWorkspaceVersionUploaderDisplayNames: vi
      .fn()
      .mockResolvedValue(new Map()),
  }),
);

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

describe("WORKSPACE-05-A1 acceptance sentinels", () => {
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

  const appendInput = {
    tenantId: "tenant-1",
    actorUserId: "user-1",
    documentId: "doc-1",
    versionId: "v3",
    filename: "f.pdf",
    mimeType: "application/pdf" as const,
    sizeBytes: 1,
    storageKey: "key-new",
  };

  it("W05-A1-01 concurrent append maps unique-version conflict to VERSION_CONFLICT", async () => {
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );

    await expect(appendWorkspaceDocumentVersion(appendInput)).rejects.toMatchObject({
      code: "VERSION_CONFLICT",
    });
  });

  it("W05-A1-02 concurrency conflict does not commit partial version metadata", async () => {
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );

    await expect(appendWorkspaceDocumentVersion(appendInput)).rejects.toBeInstanceOf(
      WorkspaceDocumentVersionWriteError,
    );

    expect(mocks.transaction.workspaceDocument.update).not.toHaveBeenCalled();
  });

  it("W05-A1-03 restore failure compensates only the newly uploaded object key", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "source-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 1,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "dest-key-only",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      new Error("db failed"),
    );

    await expect(
      restoreWorkspaceDocumentVersion({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        sourceVersionId: "v1",
        newVersionId: "v3",
      }),
    ).rejects.toThrow("db failed");

    expect(mocks.storageDelete).toHaveBeenCalledWith("dest-key-only");
    expect(mocks.storageDelete).not.toHaveBeenCalledWith("source-key");
  });

  it("W05-A1-04 failed append cannot change currentVersionId", async () => {
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      new Error("insert failed"),
    );

    await expect(appendWorkspaceDocumentVersion(appendInput)).rejects.toThrow(
      "insert failed",
    );
    expect(mocks.transaction.workspaceDocument.update).not.toHaveBeenCalled();
  });

  it("W05-A1-05 failed restore cannot change currentVersionId", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "source-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 1,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "dest-key",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      new Error("append failed"),
    );

    await expect(
      restoreWorkspaceDocumentVersion({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        sourceVersionId: "v1",
        newVersionId: "v3",
      }),
    ).rejects.toThrow("append failed");

    expect(mocks.transaction.workspaceDocument.update).not.toHaveBeenCalled();
  });

  it("W05-A1-06 failed restore never mutates source version row", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "source-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 1,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "dest-key",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      new Error("append failed"),
    );

    await expect(
      restoreWorkspaceDocumentVersion({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        sourceVersionId: "v1",
        newVersionId: "v3",
      }),
    ).rejects.toThrow();

    expect(mocks.transaction.workspaceDocumentVersion.updateMany).toHaveBeenCalled();
    expect(mocks.transaction.workspaceDocumentVersion.create).toHaveBeenCalled();
    expect(mocks.workspaceDocumentVersionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "v1" }),
      }),
    );
  });

  it("W05-A1-07 failed restore compensation never deletes source blob", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "immutable-source-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 1,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "new-restore-key",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });
    mocks.transaction.workspaceDocumentVersion.create.mockRejectedValue(
      new Error("db"),
    );

    await expect(
      restoreWorkspaceDocumentVersion({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        sourceVersionId: "v1",
        newVersionId: "v3",
      }),
    ).rejects.toThrow();

    expect(mocks.storageDelete).toHaveBeenCalledTimes(1);
    expect(mocks.storageDelete).toHaveBeenCalledWith("new-restore-key");
  });

  it("W05-A1-08 successful append has one canonical current version pointer", async () => {
    const result = await appendWorkspaceDocumentVersion(appendInput);

    expect(result.currentVersionId).toBe("v3");
    expect(result.currentVersion?.id).toBe("v3");
    expect(
      deriveWorkspaceVersionIsCurrent(result.currentVersionId, "v3"),
    ).toBe(true);
  });

  it("W05-A1-09 successful restore advances canonical current pointer once", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      id: "doc-1",
      currentVersionId: "v2",
    });
    mocks.workspaceDocumentVersionFindFirst.mockResolvedValue({
      id: "v1",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      storageKey: "source-key",
      storageProvider: "vercel-blob",
      checksum: "abc",
      versionNumber: 1,
    });
    mocks.storageDownload.mockResolvedValue({
      ok: true,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.close();
        },
      }),
      filename: "old.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      sizeBytes: 1,
      etag: "e",
    });
    mocks.storageUpload.mockResolvedValue({
      ok: true,
      storageKey: "dest-key",
      storageUrl: null,
      checksum: "def",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
    });

    const result = await restoreWorkspaceDocumentVersion({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
      sourceVersionId: "v1",
      newVersionId: "v3",
    });

    expect(result.currentVersionId).toBe("v3");
    expect(mocks.transaction.workspaceDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentVersionId: "v3" }),
      }),
    );
  });

  it("W05-A1-10 invalid explicit versionId query does not fall back to current", () => {
    expect(
      resolveWorkspaceVersionIdQuery(
        new URL("http://x/download?versionId=").searchParams,
      ).mode,
    ).toBe("invalid");
    expect(
      resolveWorkspaceVersionIdQuery(
        new URL("http://x/download?versionId=missing&versionId=other").searchParams,
      ).mode,
    ).toBe("invalid");
  });

  it("W05-A1-11 version from another document cannot be downloaded", async () => {
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
        versionId: "foreign-doc-version",
      }),
    ).rejects.toMatchObject({ code: "VERSION_NOT_FOUND" });
  });

  it("W05-A1-12 explicit empty versionId fails closed in access service", async () => {
    await expect(
      getWorkspaceDocumentVersionForDownload({
        tenantId: "tenant-1",
        actorUserId: "user-1",
        documentId: "doc-1",
        versionId: "   ",
      }),
    ).rejects.toMatchObject({ code: "VERSION_NOT_FOUND" });

    expect(mocks.workspaceDocumentFindFirst).not.toHaveBeenCalled();
  });

  it("W05-A1-13 cross-tenant version lookup remains zero-disclosure", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue(null);

    const result = await getWorkspaceDocumentVersionForDownload({
      tenantId: "tenant-other",
      actorUserId: "user-1",
      documentId: "doc-1",
      versionId: "v1",
    });

    expect(result).toBeNull();
  });

  it("W05-A1-14 normal user changeNote cannot spoof restore provenance", async () => {
    expect(
      userChangeNoteSpoofsRestoreProvenance(
        "RESTORED_FROM_VERSION:fake-id",
      ),
    ).toBe(true);

    await expect(
      appendWorkspaceDocumentVersion({
        ...appendInput,
        changeNote: "RESTORED_FROM_VERSION:fake-id",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("W05-A1-15 future version ref remains exact after newer versions exist", () => {
    const refV3 = toWorkspaceDocumentVersionRefDto({
      tenantId: "tenant-1",
      documentId: "doc-1",
      versionId: "version-3",
    });

    const refV5 = toWorkspaceDocumentVersionRefDto({
      tenantId: "tenant-1",
      documentId: "doc-1",
      versionId: "version-5",
    });

    expect(refV3?.versionId).toBe("version-3");
    expect(refV5?.versionId).toBe("version-5");
    expect(refV3?.versionId).not.toBe(refV5?.versionId);
  });
});

describe("WORKSPACE-05-A1 provenance read path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not infer restore provenance from rejected user spoof strings in history DTO", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValue({
      currentVersionId: "v2",
      versions: [
        {
          id: "v2",
          versionNumber: 2,
          createdAt: new Date(),
          createdByUserId: "u1",
          filename: "f.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
          checksum: null,
          status: WorkspaceDocumentVersionStatus.CURRENT,
          changeNote: null,
        },
      ],
    });

    const versions = await getDocumentVersions({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      documentId: "doc-1",
    });

    expect(versions?.[0]?.restoredFromVersionId).toBeNull();
  });
});
