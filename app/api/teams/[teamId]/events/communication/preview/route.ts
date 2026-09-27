import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { previewEventCommunicationRecipients } from "@/lib/communication/event/event-communication-service";
import { parseParticipationEventRefFromBody } from "@/lib/communication/event/parse-participation-event-ref";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

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

  let canSend = false;
  try {
    await requireTeamCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      teamId,
    });
    canSend = true;
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
    audiencePreset?: string;
  };

  const teamSeasonId = body.teamSeasonId?.trim();
  if (!teamSeasonId) {
    return NextResponse.json({ error: "teamSeasonId is required" }, { status: 400 });
  }

  const event = parseParticipationEventRefFromBody(body);
  const preview = await previewEventCommunicationRecipients({
    tenantId: tenant.id,
    teamId,
    teamSeasonId,
    event,
    preset: body.audiencePreset,
    senderUserId: session.user.id,
    viewerCanSend: canSend,
  });

  return NextResponse.json(preview);
}
