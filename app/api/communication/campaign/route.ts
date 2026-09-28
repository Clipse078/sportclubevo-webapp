import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createCampaignDraft, listCampaigns } from "@/lib/communication/campaign/campaign-service";
import {
  requireCampaignSend,
  requireCampaignView,
} from "@/lib/communication/campaign/campaign-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    const authz = await requireCampaignView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
    const url = new URL(request.url);
    const items = await listCampaigns({
      tenantId: tenant.id,
      viewerUserId: session.user.id,
      viewerCanSend: authz.canSend,
      limit: Number(url.searchParams.get("limit") ?? "50"),
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

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
    attachmentIds?: string[];
  };

  const result = await createCampaignDraft({
    tenantId: tenant.id,
    senderUserId: session.user.id,
    internalName: body.internalName ?? "",
    subject: body.subject,
    bodyText: body.bodyText ?? "",
    attachmentIds: body.attachmentIds,
    audienceSpec: body.audienceSpec ?? {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    },
  });

  return NextResponse.json(result, { status: 201 });
}
