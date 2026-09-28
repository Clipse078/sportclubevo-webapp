import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { previewCommunicationAudience } from "@/lib/communication/audience/communication-audience-preview-service";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import {
  requireClubCommunicationSend,
  requireClubCommunicationEngagementDetail,
} from "@/lib/communication/club/club-communication-authorization";
import { createOrganisationCommunicationContext } from "@/lib/communication/club/club-communication-context";

export const dynamic = "force-dynamic";

function resolvePreviewContext(
  contextParam: string | undefined,
  tenantId: string,
): CommunicationContextRef {
  if (contextParam === "DIRECT") return { kind: "DIRECT", tenantId };
  return createOrganisationCommunicationContext(tenantId);
}

function resolveCategory(input: {
  contextParam: string | undefined;
  kind?: string;
}): CommunicationPreferenceCategory {
  if (input.contextParam === "DIRECT") return "CLUB_OPERATIONAL";
  if (input.contextParam === "CAMPAIGN") return "SPONSOR_COMMERCIAL";
  if (input.kind === "ALERT" || input.kind === "ANNOUNCEMENT") return "CLUB_INFORMATION";
  return "CLUB_OPERATIONAL";
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = (await request.json()) as {
    audienceSpec?: CommunicationAudienceSpec;
    context?: string;
    kind?: string;
    includeRecipientDetail?: boolean;
  };

  const contextParam = body.context ?? "ORGANISATION";
  const context = resolvePreviewContext(contextParam, tenant.id);

  try {
    if (context.kind === "DIRECT") {
      await requireAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);
    } else {
      await requireClubCommunicationSend({
        tenantId: tenant.id,
        tenantKey: tenant.key,
        userId,
      });
      if (body.includeRecipientDetail) {
        await requireClubCommunicationEngagementDetail({
          tenantId: tenant.id,
          tenantKey: tenant.key,
          userId,
        });
      }
    }
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const preview = await previewCommunicationAudience({
    tenantId: tenant.id,
    senderUserId: userId,
    audience: body.audienceSpec ?? {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    },
    context,
    category: resolveCategory({ contextParam, kind: body.kind }),
    includeRecipientDetail: body.includeRecipientDetail,
  });

  return NextResponse.json(preview);
}
