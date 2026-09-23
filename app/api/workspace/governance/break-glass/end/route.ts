import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  endOwnWorkspaceBreakGlassSession,
  WorkspaceBreakGlassError,
} from "@/lib/workspace/governance/break-glass-session-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type EndBody = { sessionId?: string };

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_BREAK_GLASS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: EndBody;
  try {
    body = (await request.json()) as EndBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  try {
    await endOwnWorkspaceBreakGlassSession({
      tenantId: access.tenantId,
      actorUserId: access.actorUserId,
      sessionId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceBreakGlassError) {
      const status =
        error.code === "SESSION_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
