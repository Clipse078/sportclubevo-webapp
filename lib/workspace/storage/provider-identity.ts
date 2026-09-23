/**
 * WORKSPACE-08-06 — canonical Workspace object-storage provider identities.
 */

export const WORKSPACE_STORAGE_PROVIDER_IDS = {
  VERCEL_BLOB: "vercel-blob",
  S3_COMPATIBLE: "s3-compatible",
} as const;

export type WorkspaceStorageProviderId =
  (typeof WORKSPACE_STORAGE_PROVIDER_IDS)[keyof typeof WORKSPACE_STORAGE_PROVIDER_IDS];

const KNOWN_PROVIDER_IDS = new Set<string>(
  Object.values(WORKSPACE_STORAGE_PROVIDER_IDS),
);

export function isKnownWorkspaceStorageProviderId(
  value: string,
): value is WorkspaceStorageProviderId {
  return KNOWN_PROVIDER_IDS.has(value.trim());
}

export function normalizeWorkspaceStorageProviderId(
  value: string | null | undefined,
): WorkspaceStorageProviderId {
  const normalized = value?.trim();
  if (normalized && isKnownWorkspaceStorageProviderId(normalized)) {
    return normalized;
  }
  return WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB;
}

export type WorkspaceVersionStorageLocator = {
  storageProvider: WorkspaceStorageProviderId;
  storageKey: string;
};
