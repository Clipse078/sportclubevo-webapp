import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  canInspectCampaignEngagementDetail,
  getCampaignEngagementSummary,
} from "@/lib/communication/campaign/campaign-engagement-service";
import { requireCampaignView } from "@/lib/communication/campaign/campaign-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { campaignId } = await context.params;

  try {
    const authz = await requireCampaignView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });

    const summary = await getCampaignEngagementSummary({
      tenantId: tenant.id,
      campaignId,
    });
    if (!summary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const detail = url.searchParams.get("detail") === "1";
    if (detail) {
      const allowed = await canInspectCampaignEngagementDetail({
        tenantId: tenant.id,
        campaignId,
        viewerUserId: session.user.id,
        viewerCanViewEngagementDetail: authz.canViewEngagementDetail,
      });
      if (!allowed) {
        throw new TeamCommunicationForbiddenError();
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
