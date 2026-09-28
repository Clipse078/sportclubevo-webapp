import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  getClubCommunicationById,
  updateClubCommunicationDraft,
} from "@/lib/communication/club/club-communication-service";
import {
  requireClubCommunicationSend,
  requireClubCommunicationView,
} from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

type RouteContext = { params: Promise<{ communicationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
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
    const authz = await requireClubCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
    const item = await getClubCommunicationById({
      tenantId: tenant.id,
      communicationId,
      viewerCanSend: authz.canSend,
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const { communicationId } = await context.params;

  try {
    await requireClubCommunicationSend({
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
    bodyText?: string;
    subject?: string | null;
    audienceSpec?: CommunicationAudienceSpec;
    acknowledgementRequired?: boolean;
    attachmentIds?: string[];
  };

  const result = await updateClubCommunicationDraft({
    tenantId: tenant.id,
    communicationId,
    actorUserId: session.user.id,
    bodyText: body.bodyText,
    subject: body.subject,
    audienceSpec: body.audienceSpec,
    acknowledgementRequired: body.acknowledgementRequired,
    attachmentIds: body.attachmentIds,
  });

  return NextResponse.json(result);
}
