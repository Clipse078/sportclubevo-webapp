/**
 * WORKSPACE-08-02 — opt-in break-glass read authorization (normal ACL unchanged elsewhere).
 */

import { WorkspaceResourceType } from "@prisma/client";

import {
  canWorkspaceView,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { recordWorkspaceAccessDeniedAudit } from "@/lib/workspace/audit/workspace-audit-denied";
import {
  documentMatchesBreakGlassSessionScope,
  folderMatchesBreakGlassSessionScope,
} from "@/lib/workspace/governance/break-glass-scope";
import {
  findActorActiveBreakGlassSession,
  hasWorkspaceBreakGlassPermission,
  recordBreakGlassUsedAudit,
  WorkspaceBreakGlassError,
} from "@/lib/workspace/governance/break-glass-session-service";

export type WorkspaceGovernanceReadOperation =
  | "VIEW"
  | "DOWNLOAD"
  | "PREVIEW"
  | "VERSION_HISTORY";

export type WorkspaceGovernanceReadAuthResult =
  | { authorized: true; mode: "normal" }
  | { authorized: true; mode: "break_glass"; sessionId: string }
  | { authorized: false };

function tryNormalDocumentView(
  actor: WorkspaceActorContext,
  documentId: string,
): boolean {
  return canWorkspaceView(actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  });
}

function tryNormalFolderView(
  actor: WorkspaceActorContext,
  folderId: string,
): boolean {
  return canWorkspaceView(actor, {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  });
}

export async function authorizeWorkspaceDocumentRead(input: {
  actor: WorkspaceActorContext;
  documentId: string;
  operation: WorkspaceGovernanceReadOperation;
  breakGlass: "disallowed" | "allowed";
}): Promise<WorkspaceGovernanceReadAuthResult> {
  if (tryNormalDocumentView(input.actor, input.documentId)) {
    return { authorized: true, mode: "normal" };
  }

  if (input.breakGlass !== "allowed") {
    await recordWorkspaceAccessDeniedAudit({
      actor: input.actor,
      required: "VIEW",
      resource: {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: input.documentId,
      },
      operation:
        input.operation === "DOWNLOAD"
          ? "DOWNLOAD"
          : input.operation === "PREVIEW"
            ? "PREVIEW"
            : "VIEW",
    });
    return { authorized: false };
  }

  if (!hasWorkspaceBreakGlassPermission(input.actor.permissionKeys)) {
    await recordWorkspaceAccessDeniedAudit({
      actor: input.actor,
      required: "VIEW",
      resource: {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: input.documentId,
      },
      operation:
        input.operation === "DOWNLOAD"
          ? "DOWNLOAD"
          : input.operation === "PREVIEW"
            ? "PREVIEW"
            : "VIEW",
    });
    return { authorized: false };
  }

  const session = await findActorActiveBreakGlassSession(
    input.actor.identity.tenantId,
    input.actor.identity.userId,
  );

  if (!session) {
    await recordWorkspaceAccessDeniedAudit({
      actor: input.actor,
      required: "VIEW",
      resource: {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: input.documentId,
      },
      operation:
        input.operation === "DOWNLOAD"
          ? "DOWNLOAD"
          : input.operation === "PREVIEW"
            ? "PREVIEW"
            : "VIEW",
    });
    return { authorized: false };
  }

  const inScope = await documentMatchesBreakGlassSessionScope(
    input.actor.identity.tenantId,
    input.documentId,
    session,
  );

  if (!inScope) {
    await recordWorkspaceAccessDeniedAudit({
      actor: input.actor,
      required: "VIEW",
      resource: {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: input.documentId,
      },
      operation:
        input.operation === "DOWNLOAD"
          ? "DOWNLOAD"
          : input.operation === "PREVIEW"
            ? "PREVIEW"
            : "VIEW",
    });
    return { authorized: false };
  }

  try {
    await recordBreakGlassUsedAudit({
      tenantId: input.actor.identity.tenantId,
      actorUserId: input.actor.identity.userId,
      actorPersonId: input.actor.identity.personId,
      sessionId: session.id,
      documentId: input.documentId,
      operation: input.operation,
    });
  } catch {
    return { authorized: false };
  }

  return { authorized: true, mode: "break_glass", sessionId: session.id };
}

export async function assertWorkspaceDocumentReadWithOptionalBreakGlass(input: {
  actor: WorkspaceActorContext;
  documentId: string;
  operation: WorkspaceGovernanceReadOperation;
  breakGlass: "disallowed" | "allowed";
}): Promise<void> {
  const result = await authorizeWorkspaceDocumentRead(input);
  if (!result.authorized) {
    throw new WorkspaceAuthorizationError("Resource access denied.");
  }
}

export async function authorizeWorkspaceFolderRead(input: {
  actor: WorkspaceActorContext;
  folderId: string;
  breakGlass: "disallowed" | "allowed";
}): Promise<WorkspaceGovernanceReadAuthResult> {
  if (tryNormalFolderView(input.actor, input.folderId)) {
    return { authorized: true, mode: "normal" };
  }

  if (input.breakGlass !== "allowed") {
    return { authorized: false };
  }

  if (!hasWorkspaceBreakGlassPermission(input.actor.permissionKeys)) {
    return { authorized: false };
  }

  const session = await findActorActiveBreakGlassSession(
    input.actor.identity.tenantId,
    input.actor.identity.userId,
  );

  if (!session) {
    return { authorized: false };
  }

  const inScope = await folderMatchesBreakGlassSessionScope(
    input.actor.identity.tenantId,
    input.folderId,
    session,
  );

  if (!inScope) {
    return { authorized: false };
  }

  try {
    await recordBreakGlassUsedAudit({
      tenantId: input.actor.identity.tenantId,
      actorUserId: input.actor.identity.userId,
      actorPersonId: input.actor.identity.personId,
      sessionId: session.id,
      folderId: input.folderId,
      operation: "VIEW",
    });
  } catch {
    return { authorized: false };
  }

  return { authorized: true, mode: "break_glass", sessionId: session.id };
}

export function isBreakGlassAuthorizationError(error: unknown): boolean {
  return error instanceof WorkspaceBreakGlassError;
}
