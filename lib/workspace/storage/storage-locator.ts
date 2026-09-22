/**
 * WORKSPACE-04 — provider-neutral storage reference validation and legacy compatibility.
 *
 * Authorization always happens in Workspace domain code before any reference is
 * passed to the storage provider. References here are never treated as proof of access.
 */

export const WORKSPACE_STORAGE_ROOT = "workspace";

export const PRIVATE_STORAGE_PREFIXES = [
  `${WORKSPACE_STORAGE_ROOT}/`,
  "team-docs/",
  "communication/",
] as const;

const SECURE_TENANT_PREFIX = `${WORKSPACE_STORAGE_ROOT}/tenants/`;

export function isLegacyWorkspaceStorageKey(storageKey: string): boolean {
  const normalized = storageKey.trim();
  return (
    normalized.startsWith(`${WORKSPACE_STORAGE_ROOT}/`) &&
    !normalized.startsWith(SECURE_TENANT_PREFIX)
  );
}

export function isSecureTenantScopedStorageKey(storageKey: string): boolean {
  const normalized = storageKey.trim();
  if (!normalized.startsWith(SECURE_TENANT_PREFIX)) {
    return false;
  }

  const segments = normalized.split("/");
  return (
    segments.length >= 7 &&
    segments[0] === WORKSPACE_STORAGE_ROOT &&
    segments[1] === "tenants" &&
    Boolean(segments[2]) &&
    segments[3] === "documents" &&
    Boolean(segments[4]) &&
    segments[5] === "versions" &&
    Boolean(segments[6])
  );
}

export function isAllowedWorkspaceStorageReference(value: string): boolean {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.includes("\\") ||
    normalized.includes("://")
  ) {
    return false;
  }

  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    return false;
  }

  return PRIVATE_STORAGE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

export function normalizeWorkspaceStorageReference(
  storageReference: string,
): string {
  return storageReference.trim();
}

export type WorkspaceStoredObjectLocator = {
  provider: "vercel-blob";
  objectKey: string;
  legacy: boolean;
};

export function toWorkspaceStoredObjectLocator(
  storageKey: string,
): WorkspaceStoredObjectLocator {
  const objectKey = normalizeWorkspaceStorageReference(storageKey);

  return {
    provider: "vercel-blob",
    objectKey,
    legacy: isLegacyWorkspaceStorageKey(objectKey),
  };
}
