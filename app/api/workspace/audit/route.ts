import { NextRequest, NextResponse } from "next/server";

import type { AuditOutcome } from "@/lib/audit/audit-record";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  listWorkspaceGovernanceAuditEvents,
  WorkspaceAuditReadError,
} from "@/lib/workspace/audit/workspace-audit-read-service";

export async function GET(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.WORKSPACE_AUDIT_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  const viewerUserId = access.session.user.effectiveUserId ?? access.session.user.id;
  if (!tenantId || !viewerUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const effective = await getRequestEffectivePermissions(viewerUserId, tenantId);
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const params = request.nextUrl.searchParams;
  const cursor = params.get("cursor");
  const pageSizeRaw = params.get("pageSize");
  const pageSize = pageSizeRaw ? Number.parseInt(pageSizeRaw, 10) : undefined;

  try {
    const result = await listWorkspaceGovernanceAuditEvents({
      tenantId,
      permissionKeys,
      viewerUserId,
      cursor,
      pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
      filters: {
        action: params.get("action") ?? undefined,
        entityType: params.get("entityType") ?? undefined,
        entityId: params.get("entityId") ?? undefined,
        actorUserId: params.get("actorUserId") ?? undefined,
        outcome: (() => {
          const raw = params.get("outcome");
          if (raw === "DENIED" || raw === "FAILURE" || raw === "SUCCESS") {
            return raw as AuditOutcome;
          }
          return undefined;
        })(),
        from: params.get("from") ? new Date(params.get("from")!) : undefined,
        to: params.get("to") ? new Date(params.get("to")!) : undefined,
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceAuditReadError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[workspace-audit] GET failed", error);
    return NextResponse.json(
      { error: "Audit konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
