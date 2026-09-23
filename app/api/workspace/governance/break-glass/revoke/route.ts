import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  revokeWorkspaceBreakGlassSession,
  WorkspaceBreakGlassError,
} from "@/lib/workspace/governance/break-glass-session-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RevokeBody = { sessionId?: string };

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: RevokeBody;
  try {
    body = (await request.json()) as RevokeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  try {
    await revokeWorkspaceBreakGlassSession({
      tenantId: access.tenantId,
      revokerUserId: access.actorUserId,
      permissionKeys: access.actor.permissionKeys,
      sessionId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceBreakGlassError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "SESSION_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
