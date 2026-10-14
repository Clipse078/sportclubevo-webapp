import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { recordMatchApprovalDecision } from "@/lib/matchcenter/composer/match-approval-service";

export async function POST(request: Request) {
  const session = await auth();
  const tenant = await getActiveTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const personId = await resolvePersonIdForUser(tenant.id, session.user.id);
  if (!personId) {
    return NextResponse.json({ error: "Keine Personenzuordnung." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    revisionId?: string;
    decision?: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
    comment?: string;
  } | null;

  if (!body?.revisionId || !body.decision) {
    return NextResponse.json({ error: "revisionId und decision sind erforderlich." }, { status: 400 });
  }

  const result = await recordMatchApprovalDecision({
    tenantId: tenant.id,
    revisionId: body.revisionId,
    approverPersonId: personId,
    decision: body.decision,
    comment: body.comment,
    actorUserId: session.user.id,
    approverHeldApprovePermission: hasPermission(session, PERMISSIONS.ACTIVITIES_MATCH_APPROVE),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
