import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  getCampaignById,
  updateCampaignDraft,
} from "@/lib/communication/campaign/campaign-service";
import {
  requireCampaignSend,
  requireCampaignView,
} from "@/lib/communication/campaign/campaign-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CampaignOrchestrationMeta } from "@/lib/communication/campaign/campaign-orchestration-meta";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(_request: Request, context: RouteContext) {
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
    const item = await getCampaignById({
      tenantId: tenant.id,
      campaignId,
      viewerCanSend: authz.canSend,
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    await requireCampaignSend({
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

  const body = (await request.json()) as {
    internalName?: string;
    subject?: string | null;
    bodyText?: string;
    audienceSpec?: CommunicationAudienceSpec;
    orchestration?: CampaignOrchestrationMeta;
  };

  try {
    const result = await updateCampaignDraft({
      tenantId: tenant.id,
      campaignId,
      actorUserId: session.user.id,
      internalName: body.internalName,
      subject: body.subject,
      bodyText: body.bodyText,
      audienceSpec: body.audienceSpec,
      orchestration: body.orchestration,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
