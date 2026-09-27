import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { submitTeamPollResponse } from "@/lib/communication/team/team-poll-communication-service";
import { requireTeamCommunicationView } from "@/lib/communication/team/team-communication-authorization";
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

  const body = (await request.json()) as { optionIds?: string[] };

  await submitTeamPollResponse({
    tenantId: tenant.id,
    teamId,
    communicationId,
    actorUserId: session.user.id,
    optionIds: body.optionIds ?? [],
  });

  return NextResponse.json({ ok: true });
}
