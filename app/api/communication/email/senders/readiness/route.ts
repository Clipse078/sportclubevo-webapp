import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import {
  isSenderIdentityUsable,
  listTenantCommunicationSenderIdentities,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";

export const dynamic = "force-dynamic";

const SENDER_USE_PERMISSIONS = [
  ...CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  ...DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS,
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAnyPermission(SENDER_USE_PERMISSIONS);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandant in der Sitzung." }, { status: 403 });
  }

  const senderIdentityId = request.nextUrl.searchParams.get("senderIdentityId");

  const [senders, readiness] = await Promise.all([
    listTenantCommunicationSenderIdentities(tenantId),
    evaluatePlatformEmailReadiness(tenantId, {
      senderIdentityId,
    }),
  ]);

  const usableSenders = senders.filter(
    (sender) =>
      sender.status === "ACTIVE" && isSenderIdentityUsable({ status: sender.status, providerStatus: sender.providerStatus }),
  );

  return NextResponse.json({
    readiness,
    senders,
    usableSenders,
    platformFallback: {
      label: "SportClubEvo-Fallback",
      active: readiness.platformFallbackActive,
      effectiveFrom: readiness.ready ? readiness : null,
    },
  });
}
