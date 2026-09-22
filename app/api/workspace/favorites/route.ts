import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  listWorkspaceFavorites,
  toggleWorkspaceFavorite,
} from "@/lib/workspace/collaboration/favorites-service";

export async function GET() {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const favorites = await listWorkspaceFavorites({
    tenantId: access.tenantId,
    userId: access.actorUserId,
    actor: access.actor,
  });

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as {
    resourceType?: string;
    resourceId?: string;
  };

  if (
    (body.resourceType !== "FOLDER" && body.resourceType !== "DOCUMENT") ||
    !body.resourceId?.trim()
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const result = await toggleWorkspaceFavorite({
      tenantId: access.tenantId,
      userId: access.actorUserId,
      actor: access.actor,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
