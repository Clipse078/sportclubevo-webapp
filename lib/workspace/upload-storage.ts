/**
 * WORKSPACE-04/08-06 — Workspace upload storage entry (provider registry + key helpers).
 *
 * Vercel Blob SDK is isolated to ./storage/adapters/vercel-blob-workspace-storage.ts
 */

export {
  isAllowedWorkspaceStorageReference,
  isLegacyWorkspaceStorageKey,
  isSecureTenantScopedStorageKey,
} from "@/lib/workspace/storage/storage-locator";

export {
  calculateWorkspaceChecksum,
  getWorkspaceStorageKey,
  isTenantSafeWorkspaceStorageKey,
  parseSecureWorkspaceStorageKeyParts,
} from "@/lib/workspace/storage/workspace-storage-key";

export {
  getConfiguredWorkspaceUploadStorageProviderId,
  getWorkspaceS3CompatibleConfig,
  EXOSCALE_SOS_EXAMPLE_CONFIG_PROFILE,
} from "@/lib/workspace/storage/workspace-storage-config";

export {
  getConfiguredWorkspaceUploadStorageProvider,
  getWorkspaceStorageProvider,
  workspaceStorageProvider,
} from "@/lib/workspace/storage/workspace-storage-provider-registry";

export { VercelBlobWorkspaceStorage } from "@/lib/workspace/storage/adapters/vercel-blob-workspace-storage";
