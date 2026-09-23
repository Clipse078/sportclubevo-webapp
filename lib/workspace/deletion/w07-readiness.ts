/**
 * WORKSPACE-06 — seams for WORKSPACE-07 exact version references.
 */

export type { WorkspaceDeletionBlocker } from "@/lib/workspace/deletion/deletion-blockers";
export {
  canPermanentlyDeleteWorkspaceDocument,
  getWorkspaceDocumentDeletionBlockers,
  WORKSPACE_DELETION_BLOCKED_CODE,
} from "@/lib/workspace/deletion/deletion-blockers";

export { toWorkspaceDocumentVersionRefDto } from "@/lib/workspace/version/version-reference";
export type { WorkspaceVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
export { buildExactVersionWorkspaceUrl } from "@/lib/workspace/reference/workspace-version-reference-presentation";
export { resolveWorkspaceDocumentDirectLinkAccess } from "@/lib/workspace/document-link-access";
export type { WorkspaceDocumentVersionAcknowledgementIdentity } from "@/lib/workspace/acknowledgement/document-version-acknowledgement-identity";
export {
  deriveWorkspaceDocumentLifecycle,
  deriveWorkspaceFolderLifecycle,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
