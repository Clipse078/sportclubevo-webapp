import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
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

function logDiscoverEvent(
  correlationId: string,
  event: Record<string, string | number | boolean | null | undefined>,
) {
  console.info(
    JSON.stringify({
      scope: "communication.audience.discover",
      correlationId,
      ...event,
    }),
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  const correlationId =
    request.headers.get("x-correlation-id")?.trim() ||
    request.headers.get("x-request-id")?.trim() ||
    `sce-discover-${startedAt}`;

  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    logDiscoverEvent(correlationId, {
      phase: "auth",
      authenticated: false,
      httpStatus: 401,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const contextParam = url.searchParams.get("context") ?? "ORGANISATION";
  const context = parseContext(contextParam, tenant.id);
  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));
  const rawSources = url.searchParams.get("sources");

  logDiscoverEvent(correlationId, {
    phase: "request_started",
    context: contextParam,
    category,
    queryLength: query.length,
    sources: rawSources,
    tenantId: tenant.id,
    authenticated: true,
  });

  if (context.kind === "DIRECT") {
    const access = await requireApiAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS, tenant.id);
    if (!access.ok) {
      logDiscoverEvent(correlationId, {
        phase: "permissions",
        permissionsResolved: false,
        httpStatus: access.status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  } else if (contextParam === "CAMPAIGN") {
    try {
      await requireClubCommunicationSend({
        tenantId: tenant.id,
        tenantKey: tenant.key,
        userId,
      });
    } catch {
      logDiscoverEvent(correlationId, {
        phase: "permissions",
        permissionsResolved: false,
        httpStatus: 403,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const access = await requireApiAnyPermission(
      [PERMISSIONS.COMMUNICATION_CLUB_SEND, PERMISSIONS.COMMUNICATION_CLUB_VIEW],
      tenant.id,
    );
    if (!access.ok) {
      logDiscoverEvent(correlationId, {
        phase: "permissions",
        permissionsResolved: false,
        httpStatus: access.status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const capabilities = await resolveCommunicationAudienceCapabilities({
    tenantId: tenant.id,
    userId,
    context,
  });

  let enabledKinds = enabledKindsFromCapabilities(capabilities);

  const requestedSources = parseSelectorSourceTypesParam(rawSources);
  if (requestedSources?.length) {
    const allowed = new Set(enabledKinds);
    enabledKinds = requestedSources
      .map((t) => selectorTypeToCommunicationSearchKind(t))
      .filter((k) => allowed.has(k));
  }

  if (enabledKinds.length === 0) {
    logDiscoverEvent(correlationId, {
      phase: "response_completed",
      permissionsResolved: true,
      enabledKinds: 0,
      groupCount: 0,
      optionCount: 0,
      noAccess: true,
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ groups: [], noAccess: true });
  }

  try {
    const groups = await discoverCommunicationAudienceTargets({
      tenantId: tenant.id,
      senderUserId: userId,
      context,
      query,
      category,
      enabledKinds,
    });

    const optionCount = groups.reduce((sum, g) => sum + g.options.length, 0);
    logDiscoverEvent(correlationId, {
      phase: "response_completed",
      permissionsResolved: true,
      enabledKinds: enabledKinds.join(","),
      groupCount: groups.length,
      optionCount,
      noAccess: false,
      httpStatus: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ groups, noAccess: false });
  } catch (error) {
    logDiscoverEvent(correlationId, {
      phase: "response_error",
      permissionsResolved: true,
      errorClass: error instanceof Error ? error.name : "Error",
      httpStatus: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Auswahl konnte nicht geladen werden.", groups: [] },
      { status: 500 },
    );
  }
}
