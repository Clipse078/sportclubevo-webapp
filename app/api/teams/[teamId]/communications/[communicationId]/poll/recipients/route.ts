import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  canInspectPollRecipientDetail,
  listPollRecipientResponses,
} from "@/lib/communication/team/team-poll-communication-service";
import {
  requireTeamCommunicationView,
  resolveTeamCommunicationAuthorization,
} from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string; communicationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
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

  const authz = await resolveTeamCommunicationAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
    teamId,
  });

  const allowed = await canInspectPollRecipientDetail({
    tenantId: tenant.id,
    teamId,
    communicationId,
    viewerUserId: session.user.id,
    viewerCanSend: authz?.canSend === true,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listPollRecipientResponses({
    tenantId: tenant.id,
    teamId,
    communicationId,
  });

  return NextResponse.json({ recipients: rows });
}
