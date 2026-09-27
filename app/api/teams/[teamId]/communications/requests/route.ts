import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendTeamRequestCommunication } from "@/lib/communication/team/team-request-communication-service";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import type { RequestSlotInput } from "@/lib/communication/team/team-request-types";

type RouteContext = { params: Promise<{ teamId: string }> };

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
    title?: string;
    description?: string;
    slots?: RequestSlotInput[];
    deadlineAt?: string | null;
    audiencePreset?: string;
    eventId?: string | null;
  };

  const result = await sendTeamRequestCommunication({
    tenantId: tenant.id,
    teamId,
    senderUserId: session.user.id,
    title: body.title ?? "",
    description: body.description,
    slots: body.slots ?? [],
    deadlineAt: body.deadlineAt,
    audiencePreset: body.audiencePreset,
    eventId: body.eventId,
  });

  return NextResponse.json(result);
}
