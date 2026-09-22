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

export type WorkspaceStoredObjectMetadata = {
  provider: "vercel-blob";
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  checksumSha256?: string;
  etag?: string;
};
