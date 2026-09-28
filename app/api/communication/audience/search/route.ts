import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  searchCommunicationAudienceTargets,
  type CommunicationAudienceSearchKind,
} from "@/lib/communication/audience/communication-audience-search-service";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import {
  requireClubCommunicationSend,
} from "@/lib/communication/club/club-communication-authorization";

export const dynamic = "force-dynamic";

function parseKind(value: unknown): CommunicationAudienceSearchKind | null {
  if (
    value === "person" ||
    value === "team" ||
    value === "orgUnit" ||
    value === "role" ||
    value === "targetGroup"
  ) {
    return value;
  }
  return null;
}

function parseContext(value: unknown, tenantId: string): CommunicationContextRef {
  if (value === "DIRECT") return { kind: "DIRECT", tenantId };
  if (value === "CAMPAIGN") return { kind: "ORGANISATION", tenantId };
  return { kind: "ORGANISATION", tenantId };
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const query = url.searchParams.get("q") ?? "";
  const contextParam = url.searchParams.get("context") ?? "ORGANISATION";
  const context = parseContext(contextParam, tenant.id);

  if (!kind) {
    return NextResponse.json({ error: "Ungültiger Suchtyp." }, { status: 400 });
  }

  try {
    if (context.kind === "DIRECT") {
      await requireAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);
    } else if (contextParam === "CAMPAIGN") {
      await requireClubCommunicationSend({
        tenantId: tenant.id,
        tenantKey: tenant.key,
        userId,
      });
    } else {
      await requireAnyPermission([
        PERMISSIONS.COMMUNICATION_CLUB_SEND,
        PERMISSIONS.COMMUNICATION_CLUB_VIEW,
      ]);
    }
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const options = await searchCommunicationAudienceTargets({
    tenantId: tenant.id,
    senderUserId: userId,
    context,
    kind,
    query,
  });

  return NextResponse.json({ options });
}
