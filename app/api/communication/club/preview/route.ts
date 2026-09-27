import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { previewClubCommunicationAudience } from "@/lib/communication/club/club-preview-service";
import {
  requireClubCommunicationSend,
  requireClubCommunicationEngagementDetail,
} from "@/lib/communication/club/club-communication-authorization";
import { createOrganisationCommunicationContext } from "@/lib/communication/club/club-communication-context";
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

  const body = (await request.json()) as {
    audienceSpec?: CommunicationAudienceSpec;
    kind?: string;
    includeRecipientDetail?: boolean;
  };

  try {
    await requireClubCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
    if (body.includeRecipientDetail) {
      await requireClubCommunicationEngagementDetail({
        tenantId: tenant.id,
        tenantKey: tenant.key,
        userId: session.user.id,
      });
    }
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const kind = body.kind ?? "MESSAGE";
  const category =
    kind === "ALERT" ? "CLUB_OPERATIONAL" : kind === "ANNOUNCEMENT" ? "CLUB_INFORMATION" : "CLUB_OPERATIONAL";

  const preview = await previewClubCommunicationAudience({
    tenantId: tenant.id,
    senderUserId: session.user.id,
    audience: body.audienceSpec ?? {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    },
    context: createOrganisationCommunicationContext(tenant.id),
    category,
    includeRecipientDetail: body.includeRecipientDetail,
  });

  return NextResponse.json(preview);
}
