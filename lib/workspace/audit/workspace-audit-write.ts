import type { PrismaClient } from "@prisma/client";
import { WorkspaceResourceType } from "@prisma/client";

import {
  buildAuditData,
  type AuditOutcome,
  type LogActionInput,
  writeAuditRecord,
} from "@/lib/audit/audit-record";
import {
  WORKSPACE_GOVERNANCE_MODULE_KEY,
  type WorkspaceAuditActionValue,
} from "@/lib/workspace/audit/workspace-audit-actions";

type AuditWriter = Pick<PrismaClient, "auditLog">;

export type WorkspaceGovernanceAuditInput = {
  tenantId: string;
  actorUserId?: string | null;
  actorPersonId?: string | null;
  action: WorkspaceAuditActionValue | string;
  outcome?: AuditOutcome;
  entityType: string;
  entityId: string;
  workspaceDocumentVersionId?: string | null;
  documentId?: string | null;
  folderId?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  source?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadataJson?: Record<string, unknown>;
};

function buildWorkspaceMetadata(
  input: WorkspaceGovernanceAuditInput,
): Record<string, unknown> {
  const base = { ...(input.metadataJson ?? {}) };
  if (input.actorPersonId) {
    base.actorPersonId = input.actorPersonId;
  }
  if (input.documentId) {
    base.documentId = input.documentId;
  }
  if (input.folderId) {
    base.folderId = input.folderId;
  }
  if (input.reason) {
    base.reason = input.reason;
  }
  if (input.correlationId) {
    base.correlationId = input.correlationId;
  }
  if (input.source) {
    base.source = input.source;
  }
  return base;
}

export function toWorkspaceGovernanceLogInput(
  input: WorkspaceGovernanceAuditInput,
): LogActionInput & { workspaceDocumentVersionId?: string | null } {
  if (!input.tenantId.trim()) {
    throw new Error("Workspace governance audit requires tenantId");
  }

  return {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId ?? null,
    moduleKey: WORKSPACE_GOVERNANCE_MODULE_KEY,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    outcome: input.outcome ?? "SUCCESS",
    beforeJson: input.beforeJson,
    afterJson: input.afterJson,
    metadataJson: buildWorkspaceMetadata(input),
    workspaceDocumentVersionId: input.workspaceDocumentVersionId ?? null,
  };
}

/**
 * Mandatory transactional workspace governance audit — fails the caller transaction
 * when the audit insert fails.
 */
export async function writeWorkspaceGovernanceAudit(
  client: AuditWriter,
  input: WorkspaceGovernanceAuditInput,
): Promise<void> {
  const payload = toWorkspaceGovernanceLogInput(input);
  const data = {
    ...buildAuditData(payload),
    workspaceDocumentVersionId: payload.workspaceDocumentVersionId ?? null,
  };
  await client.auditLog.create({ data: data as never });
}

export function workspaceEntityTypeForResource(
  resourceType: WorkspaceResourceType,
): string {
  return resourceType === WorkspaceResourceType.FOLDER
    ? "WorkspaceFolder"
    : "WorkspaceDocument";
}

export { writeAuditRecord };
