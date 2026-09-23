/**
 * WORKSPACE-07 — shared Task/Requirement exact-version reference presentation.
 */

import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import type { WorkspaceDocumentLifecycleState } from "@/lib/workspace/lifecycle/lifecycle-domain";

export type WorkspaceVersionReferencePresentation =
  | {
      accessible: true;
      referenceId: string;
      documentId: string;
      versionId: string;
      versionNumber: number;
      documentTitle: string;
      documentLifecycle: WorkspaceDocumentLifecycleState;
      canonicalWorkspaceUrl: string;
    }
  | {
      accessible: false;
      referenceId: string;
    }
  | {
      accessible: "legacy_unresolved";
      referenceId: string;
      documentId: string;
      documentTitle: string;
      documentLifecycle: WorkspaceDocumentLifecycleState;
      message: string;
    };

export function buildExactVersionWorkspaceUrl(documentId: string, versionId: string): string {
  return buildWorkspaceInternalLink({
    type: "document",
    documentId,
    versionId,
  });
}

export function restrictedVersionReferencePresentation(
  referenceId: string,
): WorkspaceVersionReferencePresentation {
  return { accessible: false, referenceId };
}
