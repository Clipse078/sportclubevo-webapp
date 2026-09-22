import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { evaluateWorkspaceFolderMove } from "@/lib/workspace/access/folder-move-authorization";
import { isAllowedWorkspaceFolderMoveOutcome } from "@/lib/workspace/access/move-impact";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = { params: Promise<{ folderId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { folderId } = await context.params;
  const id = folderId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Ordner-ID fehlt." }, { status: 400 });
  }

  let body: { newParentId?: string | null };
  try {
    body = (await request.json()) as { newParentId?: string | null };
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const newParentId =
    typeof body.newParentId === "string" && body.newParentId.trim()
      ? body.newParentId.trim()
      : null;

  const result = evaluateWorkspaceFolderMove({
    actor: access.actor,
    folderId: id,
    newParentId,
  });

  return NextResponse.json(
    {
      impact: result.impact,
      allowed: isAllowedWorkspaceFolderMoveOutcome(result.impact.outcome),
      message: result.message ?? null,
    },
    { status: 200 },
  );
}
