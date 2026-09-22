import type { WorkspaceDocumentVersionRefDto } from "@/lib/workspace/document-dto";
import {
  buildWorkspaceDocumentVersionRef,
  isValidImmutableVersionReferenceTarget,
} from "@/lib/workspace/version/version-domain";

/**
 * Canonical immutable reference for future Requirement/Task acknowledgements.
 * Never resolves "latest" implicitly.
 */
export function toWorkspaceDocumentVersionRefDto(input: {
  tenantId: string;
  documentId: string;
  versionId: string;
}): WorkspaceDocumentVersionRefDto | null {
  if (!isValidImmutableVersionReferenceTarget(input.versionId)) {
    return null;
  }

  const ref = buildWorkspaceDocumentVersionRef(input);
  return {
    tenantId: ref.tenantId,
    documentId: ref.documentId,
    versionId: ref.versionId,
  };
}
