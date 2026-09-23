import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  listWorkspaceRecent,
  recordWorkspaceRecentAccess,
} from "@/lib/workspace/collaboration/recent-service";

export async function GET() {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const recent = await listWorkspaceRecent({
    tenantId: access.tenantId,
    userId: access.actorUserId,
    actor: access.actor,
  });

  return NextResponse.json({ recent });
}

export async function POST(request: NextRequest) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as {
    resourceType?: string;
    resourceId?: string;
    versionId?: string | null;
  };

  if (
    (body.resourceType !== "FOLDER" && body.resourceType !== "DOCUMENT") ||
    !body.resourceId?.trim()
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await recordWorkspaceRecentAccess({
    tenantId: access.tenantId,
    userId: access.actorUserId,
    actor: access.actor,
    resourceType: body.resourceType,
    resourceId: body.resourceId,
    versionId: body.versionId,
  });

  return NextResponse.json({ ok: true });
}
