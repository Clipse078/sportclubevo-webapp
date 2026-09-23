import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getWorkspaceSubtreeOperationStatusForActor } from "@/lib/workspace/subtree/subtree-operation-status-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = {
  params: Promise<{ operationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { operationId } = await context.params;

  const status = await getWorkspaceSubtreeOperationStatusForActor({
    tenantId: access.tenantId,
    operationId,
    actor: access.actor,
    hasWorkspaceDelete: access.actor.permissionKeys.includes(
      PERMISSIONS.WORKSPACE_DELETE,
    ),
  });

  if (!status) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ operation: status });
}
