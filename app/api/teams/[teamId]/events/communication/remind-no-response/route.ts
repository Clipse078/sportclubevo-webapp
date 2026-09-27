import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { parseParticipationEventRefFromBody } from "@/lib/communication/event/parse-participation-event-ref";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError, TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

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
    teamSeasonId?: string;
    eventKind?: string;
    eventId?: string | null;
    trainingSessionId?: string | null;
    bodyText?: string | null;
    kind?: string;
  };

  const teamSeasonId = body.teamSeasonId?.trim();
  if (!teamSeasonId) {
    return NextResponse.json({ error: "teamSeasonId is required" }, { status: 400 });
  }

  try {
    const event = parseParticipationEventRefFromBody(body);
    const result = await sendEventNoResponseSmartReminder({
      tenantId: tenant.id,
      teamId,
      teamSeasonId,
      event,
      senderUserId: session.user.id,
      viewerCanSend: true,
      bodyText: body.bodyText,
      kind: body.kind,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
