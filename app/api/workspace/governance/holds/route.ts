import { WorkspaceGovernanceHoldScopeType } from "@prisma/client";
import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  createWorkspaceGovernanceHold,
  WorkspaceGovernanceHoldError,
} from "@/lib/workspace/governance/governance-hold-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type CreateHoldBody = {
  scopeType?: string;
  documentId?: string;
  folderId?: string;
  reason?: string;
  confirm?: boolean;
};

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: CreateHoldBody;
  try {
    body = (await request.json()) as CreateHoldBody;
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
    const hold =
      scopeType === WorkspaceGovernanceHoldScopeType.DOCUMENT
        ? await createWorkspaceGovernanceHold({
            tenantId: access.tenantId,
            actorUserId: access.actorUserId,
            actorPersonId: access.actor.identity.personId,
            permissionKeys: access.actor.permissionKeys,
            reason,
            scopeType: WorkspaceGovernanceHoldScopeType.DOCUMENT,
            documentId: (body.documentId ?? "").trim(),
          })
        : scopeType === WorkspaceGovernanceHoldScopeType.FOLDER_SUBTREE
          ? await createWorkspaceGovernanceHold({
              tenantId: access.tenantId,
              actorUserId: access.actorUserId,
              actorPersonId: access.actor.identity.personId,
              permissionKeys: access.actor.permissionKeys,
              reason,
              scopeType: WorkspaceGovernanceHoldScopeType.FOLDER_SUBTREE,
              folderId: (body.folderId ?? "").trim(),
            })
          : null;

    if (!hold) {
      return NextResponse.json({ error: "Invalid scopeType." }, { status: 400 });
    }

    return NextResponse.json({
      hold: {
        id: hold.id,
        scopeType: hold.scopeType,
        documentId: hold.documentId,
        folderId: hold.folderId,
        createdAt: hold.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof WorkspaceGovernanceHoldError) {
      const status =
        err.code === "FORBIDDEN"
          ? 403
          : err.code === "TARGET_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
