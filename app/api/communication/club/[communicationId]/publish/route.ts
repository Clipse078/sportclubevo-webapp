import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { publishClubCommunication } from "@/lib/communication/club/club-communication-service";
import { consumeActivePublicationScheduleForImmediatePublish } from "@/lib/communication/scheduling/publication-schedule-service";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ communicationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { communicationId } = await context.params;

  try {
    await requireClubCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  await consumeActivePublicationScheduleForImmediatePublish({
    tenantId: tenant.id,
    communicationId,
    actorUserId: session.user.id,
  });

  let includePersonalSignature: boolean | undefined;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    includePersonalSignature =
      body.includePersonalSignature === true
        ? true
        : body.includePersonalSignature === false
          ? false
          : undefined;
  } catch {
    includePersonalSignature = undefined;
  }

  const result = await publishClubCommunication({
    tenantId: tenant.id,
    communicationId,
    senderUserId: session.user.id,
    includePersonalSignature,
  });

  return NextResponse.json(result);
}
