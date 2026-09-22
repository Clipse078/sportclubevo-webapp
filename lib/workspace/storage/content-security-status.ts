/**
 * WORKSPACE-04 — malware / threat scanning extension point (no scanner implemented).
 *
 * NOT_SCANNED must never be interpreted as CLEAN. Persistence deferred to W08.
 */

export type WorkspaceContentSecurityStatus =
  | "NOT_SCANNED"
  | "PENDING"
  | "CLEAN"
  | "BLOCKED"
  | "ERROR";

export const DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS: WorkspaceContentSecurityStatus =
  "NOT_SCANNED";

export function isWorkspaceContentAccessAllowedByScanStatus(
  status: WorkspaceContentSecurityStatus,
): boolean {
  return status === "NOT_SCANNED" || status === "CLEAN";
}
