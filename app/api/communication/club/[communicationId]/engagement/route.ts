import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  canInspectClubCommunicationEngagementDetail,
  getClubCommunicationEngagementSummary,
  listClubCommunicationRecipientEngagement,
} from "@/lib/communication/club/club-formal-communication-service";
import {
  requireClubCommunicationView,
  resolveClubCommunicationAuthorization,
} from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ communicationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { communicationId } = await context.params;

  try {
    await requireClubCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const authz = await resolveClubCommunicationAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const summary = await getClubCommunicationEngagementSummary({
    tenantId: tenant.id,
    communicationId,
  });
  if (!summary) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const includeDetail = url.searchParams.get("detail") === "1";
  let recipients: Awaited<ReturnType<typeof listClubCommunicationRecipientEngagement>> | undefined;

  if (includeDetail) {
    const allowed = await canInspectClubCommunicationEngagementDetail({
      tenantId: tenant.id,
      communicationId,
      viewerUserId: session.user.id,
      viewerCanViewEngagementDetail: authz.canViewEngagementDetail,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    recipients = await listClubCommunicationRecipientEngagement({
      tenantId: tenant.id,
      communicationId,
    });
  }

  return NextResponse.json({ summary, recipients });
}
