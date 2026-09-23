import { WorkspaceResourceType } from "@prisma/client";

import { logSecurityAction } from "@/lib/audit/log-action";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { workspaceEntityTypeForResource } from "@/lib/workspace/audit/workspace-audit-write";

export type WorkspaceDeniedAuditResource =
  | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
  | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };

/**
 * Records a DENIED governance event only when the resource exists in the actor's
 * tenant graph (avoids cross-tenant enumeration oracles).
 */
export async function recordWorkspaceAccessDeniedAudit(input: {
  actor: WorkspaceActorContext;
  required: CanonicalResourceLevel;
  resource: WorkspaceDeniedAuditResource;
  operation: "VIEW" | "EDIT" | "MANAGE" | "DOWNLOAD" | "PREVIEW" | "MUTATION";
}): Promise<void> {
  const tenantId = input.actor.identity.tenantId;
  if (tenantId !== input.actor.graph.tenantId) {
    return;
  }

  const entityId =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? input.resource.folderId
      : input.resource.documentId;

  const node =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? input.actor.graph.folders.get(entityId)
      : input.actor.graph.documents.get(entityId);

  if (!node) {
    return;
  }

  const action =
    input.operation === "DOWNLOAD"
      ? WorkspaceAuditAction.DOWNLOAD_DENIED
      : input.operation === "PREVIEW"
        ? WorkspaceAuditAction.PREVIEW_DENIED
        : WorkspaceAuditAction.ACCESS_DENIED;

  try {
    await logSecurityAction({
      tenantId,
      actorUserId: input.actor.identity.userId,
      moduleKey: "workspace",
      entityType: workspaceEntityTypeForResource(input.resource.resourceType),
      entityId,
      action,
      outcome: "DENIED",
      metadataJson: {
        required: input.required,
        operation: input.operation,
      },
    });
  } catch {
    // Denial response to caller must remain unchanged if audit infrastructure fails.
  }
}
