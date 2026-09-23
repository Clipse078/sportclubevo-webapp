/**
 * WORKSPACE-08-06 — canonical Workspace storage provider resolution (fail closed).
 */

import { S3CompatibleWorkspaceStorage } from "@/lib/workspace/storage/adapters/s3-compatible-workspace-storage";
import { VercelBlobWorkspaceStorage } from "@/lib/workspace/storage/adapters/vercel-blob-workspace-storage";
import {
  isKnownWorkspaceStorageProviderId,
  WORKSPACE_STORAGE_PROVIDER_IDS,
} from "@/lib/workspace/storage/provider-identity";
import { getConfiguredWorkspaceUploadStorageProviderId } from "@/lib/workspace/storage/workspace-storage-config";
import { WorkspaceStorageOperationError } from "@/lib/workspace/storage/storage-errors";
import type { WorkspaceStorageProvider } from "@/lib/workspace/upload-types";

const vercelBlobSingleton = new VercelBlobWorkspaceStorage();
let s3CompatibleSingleton: S3CompatibleWorkspaceStorage | null = null;

function getS3CompatibleSingleton(): S3CompatibleWorkspaceStorage {
  if (!s3CompatibleSingleton) {
    s3CompatibleSingleton = new S3CompatibleWorkspaceStorage();
  }
  return s3CompatibleSingleton;
}

export function getWorkspaceStorageProvider(
  providerId: string | null | undefined,
): WorkspaceStorageProvider {
  if (providerId == null || providerId.trim() === "") {
    return vercelBlobSingleton;
  }

  const trimmed = providerId.trim();
  if (!isKnownWorkspaceStorageProviderId(trimmed)) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      `Unknown workspace storage provider: ${trimmed}`,
    );
  }

  if (trimmed === WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB) {
    return vercelBlobSingleton;
  }

  return getS3CompatibleSingleton();
}

export function getConfiguredWorkspaceUploadStorageProvider(): WorkspaceStorageProvider {
  const providerId = getConfiguredWorkspaceUploadStorageProviderId();
  return getWorkspaceStorageProvider(providerId);
}

/** Default Vercel adapter — used only where historical default is required in tests. */
export const workspaceStorageProvider: WorkspaceStorageProvider =
  vercelBlobSingleton;

export function resetWorkspaceStorageProviderRegistryForTests(): void {
  s3CompatibleSingleton = null;
}
