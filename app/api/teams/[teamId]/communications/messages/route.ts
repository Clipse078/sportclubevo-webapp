import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  listTeamChatMessages,
  sendTeamChatMessage,
} from "@/lib/communication/team/team-chat-service";
import {
  requireTeamCommunicationSend,
  requireTeamCommunicationView,
} from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId } = await context.params;
  const url = new URL(request.url);
  const olderThanCursor = url.searchParams.get("olderThanCursor");
  const focusCommunicationId = url.searchParams.get("communicationId");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

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

  const page = await listTeamChatMessages({
    tenantId: tenant.id,
    teamId,
    viewerUserId: session.user.id,
    olderThanCursor,
    focusCommunicationId,
    limit,
  });
  return NextResponse.json(page);
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

  const body = (await request.json()) as {
    bodyText?: string;
    replyToCommunicationId?: string | null;
    mentionedPersonIds?: string[];
    attachmentIds?: string[];
  };

  const result = await sendTeamChatMessage({
    tenantId: tenant.id,
    teamId,
    senderUserId: session.user.id,
    bodyText: body.bodyText ?? "",
    replyToCommunicationId: body.replyToCommunicationId,
    mentionedPersonIds: body.mentionedPersonIds,
    attachmentIds: body.attachmentIds,
  });

  return NextResponse.json(result);
}
