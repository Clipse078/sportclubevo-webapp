/**
 * W09-07 — embed canonical availableActions on document list rows (single pass, no per-row HTTP).
 */

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import {
  computeWorkspaceDocumentAvailableActions,
  tenantCanDeleteWorkspaceResources,
  type WorkspaceDualDomainWorkflowFlags,
  type WorkspaceResourceAvailableActionsDto,
} from "@/lib/workspace/command/workspace-available-actions";

export type WorkspaceDocumentListItemWithActionsDto = WorkspaceDocumentListItemDto & {
  availableActions: WorkspaceResourceAvailableActionsDto;
};

export function enrichWorkspaceDocumentListWithAvailableActions(input: {
  actor: WorkspaceActorContext;
  tenantCanDelete: boolean;
  documents: readonly WorkspaceDocumentListItemDto[];
  workflowByDocumentId?: ReadonlyMap<string, WorkspaceDualDomainWorkflowFlags>;
}): WorkspaceDocumentListItemWithActionsDto[] {
  const tenantCanDelete =
    input.tenantCanDelete ||
    tenantCanDeleteWorkspaceResources(input.actor.permissionKeys);

  return input.documents.map((doc) => {
    const scan = doc.currentVersion?.scan;
    const contentAvailable = scan ? scan.contentAvailable : true;
    const workflow = input.workflowByDocumentId?.get(doc.id);

    const availableActions = computeWorkspaceDocumentAvailableActions({
      actor: input.actor,
      documentId: doc.id,
      document: {
        status: doc.status,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: Boolean(doc.currentVersion),
        mimeType: doc.currentVersion?.mimeType ?? null,
        contentAvailable,
      },
      tenantCanDelete,
      workflow,
    });

    return {
      ...doc,
      availableActions,
    };
  });
}
