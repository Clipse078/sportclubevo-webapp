import { WorkspaceBreakGlassScopeType } from "@prisma/client";
import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateBreakGlassTargetInTenant } from "@/lib/workspace/governance/break-glass-scope";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type ValidateBody = {
  scopeType?: string;
  documentId?: string;
  folderId?: string;
};

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_BREAK_GLASS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: ValidateBody;
  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const scopeType = body.scopeType?.trim();

  if (scopeType === WorkspaceBreakGlassScopeType.DOCUMENT) {
    const documentId = (body.documentId ?? "").trim();
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required." }, { status: 400 });
    }
    const result = await validateBreakGlassTargetInTenant(access.tenantId, {
      scopeType: WorkspaceBreakGlassScopeType.DOCUMENT,
      documentId,
    });
    if (!result.ok) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    return NextResponse.json(
      {
        valid: true,
        scopeType,
        resourceId: documentId,
      },
      { status: 200 },
    );
  }

  if (scopeType === WorkspaceBreakGlassScopeType.FOLDER_SUBTREE) {
    const folderId = (body.folderId ?? "").trim();
    if (!folderId) {
      return NextResponse.json({ error: "folderId is required." }, { status: 400 });
    }
    const result = await validateBreakGlassTargetInTenant(access.tenantId, {
      scopeType: WorkspaceBreakGlassScopeType.FOLDER_SUBTREE,
      folderId,
    });
    if (!result.ok) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    return NextResponse.json(
      {
        valid: true,
        scopeType,
        resourceId: folderId,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ error: "Invalid scopeType." }, { status: 400 });
}
