/**
 * WORKSPACE-04 seam — superseded by W08-04 persisted scan state + enforcement policy.
 *
 * NOT_SCANNED must never be interpreted as CLEAN.
 */

import { WorkspaceDocumentVersionScanState } from "@prisma/client";

import {
  DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
  evaluateWorkspaceContentDelivery,
} from "@/lib/workspace/malware-scan/scan-enforcement-policy";

export type WorkspaceContentSecurityStatus =
  | "NOT_SCANNED"
  | "PENDING"
  | "CLEAN"
  | "BLOCKED"
  | "ERROR";

export const DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS: WorkspaceContentSecurityStatus =
  "NOT_SCANNED";

/** @deprecated Prefer persisted {@link WorkspaceDocumentVersionScanState} + enforcement policy. */
export function isWorkspaceContentAccessAllowedByScanStatus(
  status: WorkspaceContentSecurityStatus,
): boolean {
  const mapped =
    status === "ERROR"
      ? WorkspaceDocumentVersionScanState.SCAN_FAILED
      : status === "NOT_SCANNED"
        ? WorkspaceDocumentVersionScanState.NOT_SCANNED
        : status === "PENDING"
          ? WorkspaceDocumentVersionScanState.PENDING
          : status === "CLEAN"
            ? WorkspaceDocumentVersionScanState.CLEAN
            : WorkspaceDocumentVersionScanState.BLOCKED;

  return evaluateWorkspaceContentDelivery(
    mapped,
    DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
  ).allowed;
}
