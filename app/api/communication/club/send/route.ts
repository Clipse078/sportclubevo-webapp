import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendClubFormalCommunication } from "@/lib/communication/club/club-formal-communication-service";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

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

  const body = (await request.json()) as {
    kind?: string;
    subject?: string | null;
    bodyText?: string;
    audienceSpec?: CommunicationAudienceSpec;
    acknowledgementRequired?: boolean;
    attachmentIds?: string[];
  };

  const result = await sendClubFormalCommunication({
    tenantId: tenant.id,
    senderUserId: session.user.id,
    kind: body.kind ?? "MESSAGE",
    subject: body.subject,
    bodyText: body.bodyText ?? "",
    audienceSpec: body.audienceSpec ?? {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    },
    acknowledgementRequired: body.acknowledgementRequired,
    attachmentIds: body.attachmentIds,
  });

  return NextResponse.json(result);
}
