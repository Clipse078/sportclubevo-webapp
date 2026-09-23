import {
  WorkspaceBreakGlassScopeType,
  WorkspaceBreakGlassSessionStatus,
  type Prisma,
  type PrismaClient,
  type WorkspaceBreakGlassSession,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import {
  WORKSPACE_BREAK_GLASS_DEFAULT_TTL_MINUTES,
  isValidBreakGlassReason,
  normalizeBreakGlassReason,
  normalizeBreakGlassTtlMinutes,
  resolveBreakGlassExpiresAt,
} from "@/lib/workspace/governance/break-glass-constants";
import {
  type BreakGlassTargetInput,
  validateBreakGlassTargetInTenant,
} from "@/lib/workspace/governance/break-glass-scope";

export class WorkspaceBreakGlassError extends Error {
  readonly code:
    | "FORBIDDEN"
    | "INVALID_INPUT"
    | "TARGET_NOT_FOUND"
    | "ACTIVE_SESSION_EXISTS"
    | "SESSION_NOT_FOUND"
    | "SESSION_NOT_ACTIVE";

  constructor(
    code: WorkspaceBreakGlassError["code"],
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceBreakGlassError";
    this.code = code;
  }
}

export function hasWorkspaceBreakGlassPermission(
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.includes(PERMISSIONS.WORKSPACE_BREAK_GLASS);
}

export function hasWorkspaceGovernanceManagePermission(
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.includes(PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE);
}

function isSessionActiveRow(
  session: WorkspaceBreakGlassSession,
  now: Date,
): boolean {
  if (session.status !== WorkspaceBreakGlassSessionStatus.ACTIVE) {
    return false;
  }
  if (session.endedAt || session.revokedAt) {
    return false;
  }
  return session.expiresAt.getTime() > now.getTime();
}

export async function findActorActiveBreakGlassSession(
  tenantId: string,
  actorUserId: string,
  client: Pick<PrismaClient, "workspaceBreakGlassSession"> = prisma,
): Promise<WorkspaceBreakGlassSession | null> {
  const now = new Date();
  const session = await client.workspaceBreakGlassSession.findFirst({
    where: {
      tenantId,
      actorUserId,
      status: WorkspaceBreakGlassSessionStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return null;
  }

  if (!isSessionActiveRow(session, now)) {
    if (session.expiresAt.getTime() <= now.getTime()) {
      await client.workspaceBreakGlassSession.update({
        where: { id: session.id },
        data: {
          status: WorkspaceBreakGlassSessionStatus.EXPIRED,
          endedAt: session.endedAt ?? now,
        },
      });
    }
    return null;
  }

  return session;
}

export type ActivateBreakGlassInput = {
  tenantId: string;
  actorUserId: string;
  actorPersonId?: string | null;
  permissionKeys: readonly string[];
  target: BreakGlassTargetInput;
  reason: string;
  ttlMinutes?: number;
};

export async function activateWorkspaceBreakGlassSession(
  input: ActivateBreakGlassInput,
): Promise<WorkspaceBreakGlassSession> {
  if (!hasWorkspaceBreakGlassPermission(input.permissionKeys)) {
    throw new WorkspaceBreakGlassError(
      "FORBIDDEN",
      "workspace.break_glass permission required.",
    );
  }

  const reason = normalizeBreakGlassReason(input.reason);
  if (!isValidBreakGlassReason(reason)) {
    throw new WorkspaceBreakGlassError(
      "INVALID_INPUT",
      "A specific, bounded reason is required for break-glass activation.",
    );
  }

  const ttlMinutes =
    normalizeBreakGlassTtlMinutes(
      input.ttlMinutes ?? WORKSPACE_BREAK_GLASS_DEFAULT_TTL_MINUTES,
    ) ?? null;

  if (ttlMinutes == null) {
    throw new WorkspaceBreakGlassError(
      "INVALID_INPUT",
      "TTL must be within the allowed break-glass window.",
    );
  }

  const targetValidation = await validateBreakGlassTargetInTenant(
    input.tenantId,
    input.target,
  );
  if (!targetValidation.ok) {
    throw new WorkspaceBreakGlassError(
      "TARGET_NOT_FOUND",
      "Break-glass target was not found in this tenant.",
    );
  }

  const expiresAt = resolveBreakGlassExpiresAt(ttlMinutes);

  return prisma.$transaction(async (tx) => {
    const existing = await findActorActiveBreakGlassSession(
      input.tenantId,
      input.actorUserId,
      tx,
    );
    if (existing) {
      throw new WorkspaceBreakGlassError(
        "ACTIVE_SESSION_EXISTS",
        "End the current break-glass session before starting a new one.",
      );
    }

    const data: Prisma.WorkspaceBreakGlassSessionCreateInput = {
      tenant: { connect: { id: input.tenantId } },
      actorUser: { connect: { id: input.actorUserId } },
      reason,
      expiresAt,
      scopeType: input.target.scopeType,
      status: WorkspaceBreakGlassSessionStatus.ACTIVE,
      ...(input.actorPersonId
        ? { actorPerson: { connect: { id: input.actorPersonId } } }
        : {}),
      ...(input.target.scopeType === WorkspaceBreakGlassScopeType.DOCUMENT
        ? {
            document: { connect: { id: input.target.documentId } },
          }
        : {
            folder: { connect: { id: input.target.folderId } },
          }),
    };

    const session = await tx.workspaceBreakGlassSession.create({ data });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorPersonId: input.actorPersonId ?? null,
      action: WorkspaceAuditAction.BREAK_GLASS_ACTIVATED,
      entityType: "WorkspaceBreakGlassSession",
      entityId: session.id,
      reason,
      documentId:
        input.target.scopeType === WorkspaceBreakGlassScopeType.DOCUMENT
          ? input.target.documentId
          : null,
      folderId:
        input.target.scopeType === WorkspaceBreakGlassScopeType.FOLDER_SUBTREE
          ? input.target.folderId
          : null,
      metadataJson: {
        breakGlassSessionId: session.id,
        scopeType: input.target.scopeType,
        expiresAt: expiresAt.toISOString(),
        ttlMinutes,
      },
    });

    return session;
  });
}

export async function endOwnWorkspaceBreakGlassSession(input: {
  tenantId: string;
  actorUserId: string;
  sessionId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const session = await tx.workspaceBreakGlassSession.findFirst({
      where: {
        id: input.sessionId,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
      },
    });

    if (!session) {
      throw new WorkspaceBreakGlassError(
        "SESSION_NOT_FOUND",
        "Break-glass session not found.",
      );
    }

    if (session.status !== WorkspaceBreakGlassSessionStatus.ACTIVE) {
      throw new WorkspaceBreakGlassError(
        "SESSION_NOT_ACTIVE",
        "Break-glass session is not active.",
      );
    }

    const now = new Date();
    await tx.workspaceBreakGlassSession.update({
      where: { id: session.id },
      data: {
        status: WorkspaceBreakGlassSessionStatus.ENDED,
        endedAt: now,
      },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: WorkspaceAuditAction.BREAK_GLASS_ENDED,
      entityType: "WorkspaceBreakGlassSession",
      entityId: session.id,
      documentId: session.workspaceDocumentId,
      folderId: session.workspaceFolderId,
      metadataJson: {
        breakGlassSessionId: session.id,
        endMode: "SELF",
      },
    });
  });
}

export async function revokeWorkspaceBreakGlassSession(input: {
  tenantId: string;
  revokerUserId: string;
  permissionKeys: readonly string[];
  sessionId: string;
}): Promise<void> {
  if (!hasWorkspaceGovernanceManagePermission(input.permissionKeys)) {
    throw new WorkspaceBreakGlassError(
      "FORBIDDEN",
      "workspace.governance.manage permission required.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const session = await tx.workspaceBreakGlassSession.findFirst({
      where: {
        id: input.sessionId,
        tenantId: input.tenantId,
      },
    });

    if (!session) {
      throw new WorkspaceBreakGlassError(
        "SESSION_NOT_FOUND",
        "Break-glass session not found.",
      );
    }

    if (session.status !== WorkspaceBreakGlassSessionStatus.ACTIVE) {
      throw new WorkspaceBreakGlassError(
        "SESSION_NOT_ACTIVE",
        "Break-glass session is not active.",
      );
    }

    const now = new Date();
    await tx.workspaceBreakGlassSession.update({
      where: { id: session.id },
      data: {
        status: WorkspaceBreakGlassSessionStatus.REVOKED,
        revokedAt: now,
        endedAt: now,
        revokedByUser: { connect: { id: input.revokerUserId } },
      },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.revokerUserId,
      action: WorkspaceAuditAction.BREAK_GLASS_REVOKED,
      entityType: "WorkspaceBreakGlassSession",
      entityId: session.id,
      documentId: session.workspaceDocumentId,
      folderId: session.workspaceFolderId,
      metadataJson: {
        breakGlassSessionId: session.id,
        targetActorUserId: session.actorUserId,
      },
    });
  });
}

export async function recordBreakGlassUsedAudit(input: {
  tenantId: string;
  actorUserId: string;
  actorPersonId?: string | null;
  sessionId: string;
  documentId?: string | null;
  folderId?: string | null;
  operation: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const session = await tx.workspaceBreakGlassSession.findFirst({
      where: {
        id: input.sessionId,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
      },
    });

    if (!session || !isSessionActiveRow(session, new Date())) {
      throw new WorkspaceBreakGlassError(
        "SESSION_NOT_ACTIVE",
        "Break-glass session is not active.",
      );
    }

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorPersonId: input.actorPersonId ?? null,
      action: WorkspaceAuditAction.BREAK_GLASS_USED,
      entityType: "WorkspaceBreakGlassSession",
      entityId: session.id,
      documentId: input.documentId ?? session.workspaceDocumentId,
      folderId: input.folderId ?? session.workspaceFolderId,
      metadataJson: {
        breakGlassSessionId: session.id,
        operation: input.operation,
      },
    });
  });
}
