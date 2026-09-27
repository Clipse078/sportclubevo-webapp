import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  canInspectTeamCommunicationEngagementDetail,
  getTeamCommunicationEngagementSummary,
  listTeamCommunicationRecipientEngagement,
} from "@/lib/communication/team/team-formal-communication-service";
import {
  requireTeamCommunicationView,
} from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string; communicationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId, communicationId } = await context.params;
  const url = new URL(request.url);
  const includeRecipients = url.searchParams.get("recipients") === "true";

  let authz;
  try {
    authz = await requireTeamCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      teamId,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const summary = await getTeamCommunicationEngagementSummary({
    tenantId: tenant.id,
    teamId,
    communicationId,
  });
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!includeRecipients) {
    return NextResponse.json({ summary });
  }

  const canInspect = await canInspectTeamCommunicationEngagementDetail({
    tenantId: tenant.id,
    teamId,
    communicationId,
    viewerUserId: session.user.id,
    viewerCanSend: authz.canSend,
  });
  if (!canInspect) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recipients = await listTeamCommunicationRecipientEngagement({
    tenantId: tenant.id,
    teamId,
    communicationId,
  });

  return NextResponse.json({ summary, recipients });
}
