import { describe, expect, it, vi } from "vitest";

import { purgeWorkspaceVersionStorageKeys } from "@/lib/workspace/governance/workspace-purge-storage";

const deleteMock = vi.fn();

vi.mock("@/lib/workspace/storage/workspace-storage-provider-registry", () => ({
  getWorkspaceStorageProvider: vi.fn(() => ({
    delete: deleteMock,
  })),
}));

describe("workspace purge storage (W08-06)", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    deleteMock.mockResolvedValue(undefined);
  });

  it("shared key on different providers is not treated as collision", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const result = await purgeWorkspaceVersionStorageKeys(
      {
        workspaceDocumentVersion: { count },
      } as never,
      "tenant-1",
      "doc-a",
      [
        { storageKey: "shared-key", storageProvider: "vercel-blob" },
        { storageKey: "shared-key", storageProvider: "s3-compatible" },
      ],
    );

    expect(result.ok).toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        storageKey: "shared-key",
        storageProvider: "vercel-blob",
        NOT: { documentId: "doc-a" },
      },
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        storageKey: "shared-key",
        storageProvider: "s3-compatible",
        NOT: { documentId: "doc-a" },
      },
    });
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it("same provider + shared key remains protected", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const result = await purgeWorkspaceVersionStorageKeys(
      {
        workspaceDocumentVersion: { count },
      } as never,
      "tenant-1",
      "doc-a",
      [{ storageKey: "shared-key", storageProvider: "vercel-blob" }],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.kind).toBe("SHARED_OBJECT");
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
