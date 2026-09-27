import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { selectDatePollWinner } from "@/lib/communication/team/team-poll-communication-service";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string; communicationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId, communicationId } = await context.params;

  let authz;
  try {
    authz = await requireTeamCommunicationSend({
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

  const body = (await request.json()) as { optionId?: string };

  await selectDatePollWinner({
    tenantId: tenant.id,
    teamId,
    communicationId,
    optionId: body.optionId ?? "",
    actorUserId: session.user.id,
    viewerCanSend: authz.canSend,
  });

  return NextResponse.json({ ok: true });
}
