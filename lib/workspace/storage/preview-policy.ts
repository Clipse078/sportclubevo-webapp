/**
 * WORKSPACE-04 — explicit inline preview allowlist (post-authorization only).
 */

import type { AllowedWorkspaceMimeType } from "@/lib/workspace/upload-types";

const INLINE_PREVIEW_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const BLOCKED_INLINE_MIME_TYPES = new Set<string>([
  "text/html",
  "image/svg+xml",
  "application/javascript",
  "text/javascript",
  "application/xml",
  "text/xml",
]);

export function isWorkspaceInlinePreviewSupported(
  mimeType: string,
): boolean {
  const normalized = mimeType.trim().toLowerCase();

  if (BLOCKED_INLINE_MIME_TYPES.has(normalized)) {
    return false;
  }

  if (INLINE_PREVIEW_MIME_TYPES.has(normalized)) {
    return true;
  }

  if (normalized.startsWith("image/")) {
    return normalized !== "image/svg+xml";
  }

  return false;
}

export function assertWorkspaceInlinePreviewSupported(
  mimeType: AllowedWorkspaceMimeType | string,
): boolean {
  return isWorkspaceInlinePreviewSupported(mimeType);
}
