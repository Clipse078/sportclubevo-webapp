import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  discoverCommunicationAudienceTargets,
  type CommunicationAudienceDiscoverCategory,
  type CommunicationAudienceSearchKind,
} from "@/lib/communication/audience/communication-audience-search-service";
import {
  parseSelectorSourceTypesParam,
  selectorTypeToCommunicationSearchKind,
} from "@/lib/sce/list-selector/communication-bridge";
import { resolveCommunicationAudienceCapabilities } from "@/lib/communication/audience/communication-audience-capabilities";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";

export const dynamic = "force-dynamic";

function parseContext(value: unknown, tenantId: string): CommunicationContextRef {
  if (value === "DIRECT") return { kind: "DIRECT", tenantId };
  return { kind: "ORGANISATION", tenantId };
}

function parseCategory(value: string | null): CommunicationAudienceDiscoverCategory {
  if (
    value === "person" ||
    value === "team" ||
    value === "orgUnit" ||
    value === "role" ||
    value === "targetGroup" ||
    value === "external"
  ) {
    return value;
  }
  return "all";
}

function enabledKindsFromCapabilities(
  capabilities: Awaited<ReturnType<typeof resolveCommunicationAudienceCapabilities>>,
): CommunicationAudienceSearchKind[] {
  const kinds: CommunicationAudienceSearchKind[] = [];
  if (capabilities.persons) kinds.push("person");
  if (capabilities.teams) kinds.push("team");
  if (capabilities.orgUnits) kinds.push("orgUnit");
  if (capabilities.roles) kinds.push("role");
  if (capabilities.targetGroups) kinds.push("targetGroup");
  if (capabilities.externalContacts) kinds.push("external");
  return kinds;
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const contextParam = url.searchParams.get("context") ?? "ORGANISATION";
  const context = parseContext(contextParam, tenant.id);
  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));

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

  const capabilities = await resolveCommunicationAudienceCapabilities({
    tenantId: tenant.id,
    userId,
    context,
  });

  let enabledKinds = enabledKindsFromCapabilities(capabilities);

  const requestedSources = parseSelectorSourceTypesParam(url.searchParams.get("sources"));
  if (requestedSources?.length) {
    const allowed = new Set(enabledKinds);
    enabledKinds = requestedSources
      .map((t) => selectorTypeToCommunicationSearchKind(t))
      .filter((k) => allowed.has(k));
  }

  if (enabledKinds.length === 0) {
    return NextResponse.json({ groups: [], noAccess: true });
  }

  const groups = await discoverCommunicationAudienceTargets({
    tenantId: tenant.id,
    senderUserId: userId,
    context,
    query,
    category,
    enabledKinds,
  });

  return NextResponse.json({ groups, noAccess: false });
}
