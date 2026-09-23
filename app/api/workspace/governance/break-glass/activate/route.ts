import { WorkspaceBreakGlassScopeType } from "@prisma/client";
import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  activateWorkspaceBreakGlassSession,
  WorkspaceBreakGlassError,
} from "@/lib/workspace/governance/break-glass-session-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type ActivateBody = {
  scopeType?: string;
  documentId?: string;
  folderId?: string;
  reason?: string;
  ttlMinutes?: number;
  confirm?: boolean;
};

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_BREAK_GLASS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Explicit confirmation is required (confirm: true)." },
      { status: 400 },
    );
  }

  const scopeType = body.scopeType?.trim();
  const reason = body.reason ?? "";

  try {
    const session =
      scopeType === WorkspaceBreakGlassScopeType.DOCUMENT
        ? await activateWorkspaceBreakGlassSession({
            tenantId: access.tenantId,
            actorUserId: access.actorUserId,
            actorPersonId: access.actor.identity.personId,
            permissionKeys: access.actor.permissionKeys,
            reason,
            ttlMinutes: body.ttlMinutes,
            target: {
              scopeType: WorkspaceBreakGlassScopeType.DOCUMENT,
              documentId: (body.documentId ?? "").trim(),
            },
          })
        : scopeType === WorkspaceBreakGlassScopeType.FOLDER_SUBTREE
          ? await activateWorkspaceBreakGlassSession({
              tenantId: access.tenantId,
              actorUserId: access.actorUserId,
              actorPersonId: access.actor.identity.personId,
              permissionKeys: access.actor.permissionKeys,
              reason,
              ttlMinutes: body.ttlMinutes,
              target: {
                scopeType: WorkspaceBreakGlassScopeType.FOLDER_SUBTREE,
                folderId: (body.folderId ?? "").trim(),
              },
            })
          : null;

    if (!session) {
      return NextResponse.json({ error: "Invalid scopeType." }, { status: 400 });
    }

    return NextResponse.json(
      {
        session: {
          id: session.id,
          scopeType: session.scopeType,
          workspaceDocumentId: session.workspaceDocumentId,
          workspaceFolderId: session.workspaceFolderId,
          expiresAt: session.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WorkspaceBreakGlassError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "TARGET_NOT_FOUND"
            ? 404
            : error.code === "ACTIVE_SESSION_EXISTS"
              ? 409
              : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
