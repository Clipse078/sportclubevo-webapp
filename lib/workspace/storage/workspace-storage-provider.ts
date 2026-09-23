/**
 * WORKSPACE-04 — provider-neutral Workspace storage contract (domain-facing).
 */

export type {
  WorkspaceStorageDownloadInput,
  WorkspaceStorageDownloadResult,
  WorkspaceStorageProvider,
  WorkspaceStorageUploadInput,
  WorkspaceStorageUploadResult,
} from "@/lib/workspace/upload-types";

import type { WorkspaceStorageProviderId } from "@/lib/workspace/storage/provider-identity";

export type WorkspaceStoredObjectMetadata = {
  provider: WorkspaceStorageProviderId;
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  checksumSha256?: string;
  etag?: string;
};
