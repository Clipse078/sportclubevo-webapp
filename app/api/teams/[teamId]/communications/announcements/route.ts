import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendTeamFormalCommunication } from "@/lib/communication/team/team-formal-communication-service";
import {
  requireTeamCommunicationSend,
} from "@/lib/communication/team/team-communication-authorization";
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
    subject?: string;
    bodyText?: string;
    audiencePreset?: string;
    acknowledgementRequired?: boolean;
    attachmentIds?: string[];
  };

  const result = await sendTeamFormalCommunication({
    tenantId: tenant.id,
    teamId,
    senderUserId: session.user.id,
    kind: "ANNOUNCEMENT",
    subject: body.subject,
    bodyText: body.bodyText ?? "",
    audiencePreset: body.audiencePreset,
    acknowledgementRequired: body.acknowledgementRequired,
    attachmentIds: body.attachmentIds,
  });

  return NextResponse.json(result);
}
