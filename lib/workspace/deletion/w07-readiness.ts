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
export { resolveWorkspaceDocumentDirectLinkAccess } from "@/lib/workspace/document-link-access";
export {
  deriveWorkspaceDocumentLifecycle,
  deriveWorkspaceFolderLifecycle,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
