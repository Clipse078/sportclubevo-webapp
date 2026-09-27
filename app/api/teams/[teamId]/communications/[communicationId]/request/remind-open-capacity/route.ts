import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendRequestOpenCapacitySmartReminder } from "@/lib/communication/smart-reminders/request-reminder-service";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError, TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

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
  const body = (await request.json().catch(() => ({}))) as { slotId?: string | null };

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

  try {
    const result = await sendRequestOpenCapacitySmartReminder({
      tenantId: tenant.id,
      teamId,
      communicationId,
      senderUserId: session.user.id,
      viewerCanSend: true,
      slotId: body.slotId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
