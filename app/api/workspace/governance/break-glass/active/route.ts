import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { findActorActiveBreakGlassSession } from "@/lib/workspace/governance/break-glass-session-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

export async function GET() {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_BREAK_GLASS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const session = await findActorActiveBreakGlassSession(
    access.tenantId,
    access.actorUserId,
  );

  if (!session) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      session: {
        id: session.id,
        scopeType: session.scopeType,
        workspaceDocumentId: session.workspaceDocumentId,
        workspaceFolderId: session.workspaceFolderId,
        reason: session.reason,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      },
    },
    { status: 200 },
  );
}
