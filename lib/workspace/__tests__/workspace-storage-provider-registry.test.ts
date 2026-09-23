import { describe, expect, it } from "vitest";

import {
  getWorkspaceStorageProvider,
} from "@/lib/workspace/storage/workspace-storage-provider-registry";
import { WORKSPACE_STORAGE_PROVIDER_IDS } from "@/lib/workspace/storage/provider-identity";
import { WorkspaceStorageOperationError } from "@/lib/workspace/storage/storage-errors";
import { VercelBlobWorkspaceStorage } from "@/lib/workspace/storage/adapters/vercel-blob-workspace-storage";
import { S3CompatibleWorkspaceStorage } from "@/lib/workspace/storage/adapters/s3-compatible-workspace-storage";

describe("workspace storage provider registry", () => {
  it("resolves vercel-blob adapter", () => {
    const provider = getWorkspaceStorageProvider(
      WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB,
    );
    expect(provider).toBeInstanceOf(VercelBlobWorkspaceStorage);
  });

  it("resolves s3-compatible adapter", () => {
    const provider = getWorkspaceStorageProvider(
      WORKSPACE_STORAGE_PROVIDER_IDS.S3_COMPATIBLE,
    );
    expect(provider).toBeInstanceOf(S3CompatibleWorkspaceStorage);
  });

  it("unknown provider fails closed", () => {
    expect(() => getWorkspaceStorageProvider("unknown-vendor")).toThrow(
      WorkspaceStorageOperationError,
    );
  });

  it("legacy null provider defaults to vercel-blob", () => {
    const provider = getWorkspaceStorageProvider(null);
    expect(provider).toBeInstanceOf(VercelBlobWorkspaceStorage);
  });
});
