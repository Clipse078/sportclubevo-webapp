/**
 * WORKSPACE-07 — acknowledgement identity readiness (no workflow in W07).
 *
 * Future document acknowledgements must bind an immutable WorkspaceDocumentVersion.id,
 * never currentVersionId or symbolic "latest".
 */

export type WorkspaceDocumentVersionAcknowledgementIdentity = {
  tenantId: string;
  workspaceDocumentVersionId: string;
  acknowledgedAt: string;
  actorUserId?: string | null;
  actorPersonId?: string | null;
  taskId?: string | null;
  requirementId?: string | null;
};

export function assertAcknowledgementVersionIdentity(input: {
  workspaceDocumentVersionId: string;
  currentVersionId?: string | null;
}): void {
  const versionId = input.workspaceDocumentVersionId.trim();
  if (!versionId) {
    throw new Error("Acknowledgement requires workspaceDocumentVersionId");
  }
  if (input.currentVersionId?.trim() === versionId && !versionId) {
    throw new Error("Acknowledgement must not rely on mutable currentVersionId alone");
  }
}
