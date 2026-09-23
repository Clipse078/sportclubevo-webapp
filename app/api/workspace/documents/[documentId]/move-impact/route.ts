import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { evaluateWorkspaceDocumentMove } from "@/lib/workspace/access/document-move-authorization";
import { isAllowedWorkspaceDocumentMoveOutcome } from "@/lib/workspace/access/move-impact";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { documentId } = await context.params;
  const id = documentId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Dokument-ID fehlt." }, { status: 400 });
  }

  let body: { folderId?: string | null };
  try {
    body = (await request.json()) as { folderId?: string | null };
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const newFolderId =
    typeof body.folderId === "string" && body.folderId.trim()
      ? body.folderId.trim()
      : null;

  const result = evaluateWorkspaceDocumentMove({
    actor: access.actor,
    documentId: id,
    newFolderId,
  });

  return NextResponse.json(
    {
      impact: result.impact,
      allowed: isAllowedWorkspaceDocumentMoveOutcome(result.impact.outcome),
      message: result.message ?? null,
    },
    { status: 200 },
  );
}
