import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  createTeamCommunicationDraft,
  listTeamCommunications,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import {
  requireTeamCommunicationSend,
  requireTeamCommunicationView,
} from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId } = await context.params;

  try {
    await requireTeamCommunicationView({
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

  const items = await listTeamCommunications({ tenantId: tenant.id, teamId });
  return NextResponse.json({ items });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId } = await context.params;

  try {
    await requireTeamCommunicationSend({
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

  const body = (await request.json()) as { bodyText?: string; publish?: boolean };
  const created = await createTeamCommunicationDraft({
    tenantId: tenant.id,
    teamId,
    senderUserId: session.user.id,
    bodyText: body.bodyText ?? "",
  });

  if (body.publish) {
    const published = await publishTeamCommunication({
      tenantId: tenant.id,
      teamId,
      communicationId: created.id,
      senderUserId: session.user.id,
    });
    return NextResponse.json({ id: created.id, published: true, recipientCount: published.recipientCount });
  }

  return NextResponse.json({ id: created.id, published: false });
}
