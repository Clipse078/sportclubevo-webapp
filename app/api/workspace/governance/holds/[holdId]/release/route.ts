import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  releaseWorkspaceGovernanceHold,
  WorkspaceGovernanceHoldError,
} from "@/lib/workspace/governance/governance-hold-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type Params = { params: Promise<{ holdId: string }> };

type ReleaseBody = {
  releaseReason?: string;
  confirm?: boolean;
};

export async function POST(request: Request, { params }: Params) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { holdId } = await params;

  let body: ReleaseBody;
  try {
    body = (await request.json()) as ReleaseBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Explicit confirmation is required (confirm: true)." },
      { status: 400 },
    );
  }

  try {
    const hold = await releaseWorkspaceGovernanceHold({
      tenantId: access.tenantId,
      holdId: holdId.trim(),
      actorUserId: access.actorUserId,
      actorPersonId: access.actor.identity.personId,
      permissionKeys: access.actor.permissionKeys,
      releaseReason: body.releaseReason ?? "",
    });

    return NextResponse.json({
      hold: {
        id: hold.id,
        releasedAt: hold.releasedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    if (err instanceof WorkspaceGovernanceHoldError) {
      const status =
        err.code === "FORBIDDEN"
          ? 403
          : err.code === "HOLD_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
