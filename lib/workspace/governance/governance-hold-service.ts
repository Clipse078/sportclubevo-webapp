import {
  WorkspaceGovernanceHoldScopeType,
  type PrismaClient,
  type WorkspaceGovernanceHold,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import {
  isValidGovernanceHoldReason,
  normalizeGovernanceHoldReason,
} from "@/lib/workspace/governance/governance-hold-constants";
import { hasWorkspaceGovernanceManagePermission } from "@/lib/workspace/governance/break-glass-session-service";

export class WorkspaceGovernanceHoldError extends Error {
  readonly code:
    | "FORBIDDEN"
    | "INVALID_INPUT"
    | "TARGET_NOT_FOUND"
    | "HOLD_NOT_FOUND"
    | "HOLD_ALREADY_RELEASED";

  constructor(code: WorkspaceGovernanceHoldError["code"], message: string) {
    super(message);
    this.name = "WorkspaceGovernanceHoldError";
    this.code = code;
  }
}

export type CreateGovernanceHoldInput =
  | {
      tenantId: string;
      actorUserId: string;
      actorPersonId?: string | null;
      permissionKeys: readonly string[];
      reason: string;
      scopeType: typeof WorkspaceGovernanceHoldScopeType.DOCUMENT;
      documentId: string;
    }
  | {
      tenantId: string;
      actorUserId: string;
      actorPersonId?: string | null;
      permissionKeys: readonly string[];
      reason: string;
      scopeType: typeof WorkspaceGovernanceHoldScopeType.FOLDER_SUBTREE;
      folderId: string;
    };

function assertGovernanceManage(permissionKeys: readonly string[]): void {
  if (!hasWorkspaceGovernanceManagePermission(permissionKeys)) {
    throw new WorkspaceGovernanceHoldError(
      "FORBIDDEN",
      "workspace.governance.manage is required.",
    );
  }
}

async function assertTargetInTenant(
  client: Pick<PrismaClient, "workspaceDocument" | "workspaceFolder">,
  input: CreateGovernanceHoldInput,
): Promise<void> {
  if (input.scopeType === WorkspaceGovernanceHoldScopeType.DOCUMENT) {
    const doc = await client.workspaceDocument.findFirst({
      where: { id: input.documentId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!doc) {
      throw new WorkspaceGovernanceHoldError(
        "TARGET_NOT_FOUND",
        "Governance target not found.",
      );
    }
    return;
  }

  const folder = await client.workspaceFolder.findFirst({
    where: { id: input.folderId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!folder) {
    throw new WorkspaceGovernanceHoldError(
      "TARGET_NOT_FOUND",
      "Governance target not found.",
    );
  }
}

export async function createWorkspaceGovernanceHold(
  input: CreateGovernanceHoldInput,
): Promise<WorkspaceGovernanceHold> {
  assertGovernanceManage(input.permissionKeys);

  const reason = normalizeGovernanceHoldReason(input.reason);
  if (!isValidGovernanceHoldReason(reason)) {
    throw new WorkspaceGovernanceHoldError(
      "INVALID_INPUT",
      "A specific governance hold reason is required.",
    );
  }

  return prisma.$transaction(async (tx) => {
    await assertTargetInTenant(tx, input);

    const hold = await tx.workspaceGovernanceHold.create({
      data:
        input.scopeType === WorkspaceGovernanceHoldScopeType.DOCUMENT
          ? {
              tenantId: input.tenantId,
              scopeType: input.scopeType,
              documentId: input.documentId,
              reason,
              createdByUserId: input.actorUserId,
              createdByPersonId: input.actorPersonId ?? null,
            }
          : {
              tenantId: input.tenantId,
              scopeType: input.scopeType,
              folderId: input.folderId,
              reason,
              createdByUserId: input.actorUserId,
              createdByPersonId: input.actorPersonId ?? null,
            },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorPersonId: input.actorPersonId ?? null,
      entityType: "WorkspaceGovernanceHold",
      entityId: hold.id,
      documentId:
        input.scopeType === WorkspaceGovernanceHoldScopeType.DOCUMENT
          ? input.documentId
          : null,
      folderId:
        input.scopeType === WorkspaceGovernanceHoldScopeType.FOLDER_SUBTREE
          ? input.folderId
          : null,
      action: WorkspaceAuditAction.GOVERNANCE_HOLD_CREATED,
      afterJson: {
        scopeType: hold.scopeType,
        holdId: hold.id,
      },
      reason,
    });

    return hold;
  });
}

export async function releaseWorkspaceGovernanceHold(input: {
  tenantId: string;
  holdId: string;
  actorUserId: string;
  actorPersonId?: string | null;
  permissionKeys: readonly string[];
  releaseReason: string;
}): Promise<WorkspaceGovernanceHold> {
  assertGovernanceManage(input.permissionKeys);

  const releaseReason = normalizeGovernanceHoldReason(input.releaseReason);
  if (!isValidGovernanceHoldReason(releaseReason)) {
    throw new WorkspaceGovernanceHoldError(
      "INVALID_INPUT",
      "A specific release reason is required.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const hold = await tx.workspaceGovernanceHold.findFirst({
      where: { id: input.holdId, tenantId: input.tenantId },
    });

    if (!hold) {
      throw new WorkspaceGovernanceHoldError(
        "HOLD_NOT_FOUND",
        "Governance hold not found.",
      );
    }

    if (hold.releasedAt) {
      throw new WorkspaceGovernanceHoldError(
        "HOLD_ALREADY_RELEASED",
        "Governance hold is already released.",
      );
    }

    const releasedAt = new Date();
    const updated = await tx.workspaceGovernanceHold.update({
      where: { id: hold.id },
      data: {
        releasedAt,
        releasedByUserId: input.actorUserId,
        releasedByPersonId: input.actorPersonId ?? null,
        releaseReason,
      },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorPersonId: input.actorPersonId ?? null,
      entityType: "WorkspaceGovernanceHold",
      entityId: hold.id,
      documentId: hold.documentId,
      folderId: hold.folderId,
      action: WorkspaceAuditAction.GOVERNANCE_HOLD_RELEASED,
      beforeJson: { holdId: hold.id, releasedAt: null },
      afterJson: { holdId: hold.id, releasedAt: releasedAt.toISOString() },
      reason: releaseReason,
    });

    return updated;
  });
}

/** Reserved alias for audit vocabulary tests. */
export const GOVERNANCE_HOLD_AUDIT_CREATED = WorkspaceAuditAction.GOVERNANCE_HOLD_CREATED;
export const GOVERNANCE_HOLD_AUDIT_RELEASED = WorkspaceAuditAction.GOVERNANCE_HOLD_RELEASED;