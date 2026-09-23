import { createHash } from "node:crypto";

import { sanitizeWorkspaceFilename } from "@/lib/workspace/upload-types";

function normalizeStorageSegment(
  value: string,
  fallback: string,
): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function getWorkspaceStorageKey(input: {
  tenantId: string;
  documentId: string;
  versionId: string;
  filename: string;
}): string {
  const tenantId = normalizeStorageSegment(input.tenantId, "tenant");
  const documentId = normalizeStorageSegment(
    input.documentId,
    "document",
  );
  const versionId = normalizeStorageSegment(
    input.versionId,
    "version",
  );

  const filename = sanitizeWorkspaceFilename(input.filename);

  return [
    "workspace",
    "tenants",
    tenantId,
    "documents",
    documentId,
    "versions",
    versionId,
    filename,
  ].join("/");
}

export function calculateWorkspaceChecksum(
  buffer: Uint8Array,
): string {
  return createHash("sha256")
    .update(buffer)
    .digest("hex");
}

export function isTenantSafeWorkspaceStorageKey(input: {
  tenantId: string;
  storageKey: string;
}): boolean {
  const tenantSegment = normalizeStorageSegment(input.tenantId, "tenant");
  const expectedPrefix = `workspace/tenants/${tenantSegment}/`;
  return input.storageKey.trim().startsWith(expectedPrefix);
}

export type WorkspaceStorageKeyParts = {
  tenantSegment: string;
  documentSegment: string;
  versionSegment: string;
};

export function parseSecureWorkspaceStorageKeyParts(
  storageKey: string,
): WorkspaceStorageKeyParts | null {
  const normalized = storageKey.trim();
  const segments = normalized.split("/");
  if (
    segments.length < 8 ||
    segments[0] !== "workspace" ||
    segments[1] !== "tenants" ||
    !segments[2] ||
    segments[3] !== "documents" ||
    !segments[4] ||
    segments[5] !== "versions" ||
    !segments[6]
  ) {
    return null;
  }
  return {
    tenantSegment: segments[2]!,
    documentSegment: segments[4]!,
    versionSegment: segments[6]!,
  };
}
