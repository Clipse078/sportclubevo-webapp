import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
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
import {
  communicationDiscoverParamToAuthorizationContext,
  parseCommunicationAudienceDiscoverContextParam,
  routePermissionsForSelectorAuthorizationContext,
  type CommunicationAudienceDiscoverContextParam,
} from "@/lib/sce/list-selector/selector-authorization-context";
import { sceSelectorDiscoverApiErrorBody } from "@/lib/sce/list-selector/selector-discover-api-errors";

export const dynamic = "force-dynamic";

function parseContextRef(
  param: CommunicationAudienceDiscoverContextParam,
  tenantId: string,
): CommunicationContextRef {
  if (param === "DIRECT") return { kind: "DIRECT", tenantId };
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
    return NextResponse.json(
      { error: sceSelectorDiscoverApiErrorBody(401) },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const rawContextParam = url.searchParams.get("context");
  const discoverContextParam =
    rawContextParam == null || rawContextParam === ""
      ? "ORGANISATION"
      : parseCommunicationAudienceDiscoverContextParam(rawContextParam);
  if (!discoverContextParam) {
    return NextResponse.json(
      { error: "Ungültiger Kontext.", groups: [] },
      { status: 400 },
    );
  }

  const context = parseContextRef(discoverContextParam, tenant.id);
  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));
  const rawSources = url.searchParams.get("sources");

  logDiscoverEvent(correlationId, {
    phase: "request_started",
    context: discoverContextParam,
    category,
    queryLength: query.length,
    sources: rawSources,
    tenantId: tenant.id,
    authenticated: true,
  });

  const authContext = communicationDiscoverParamToAuthorizationContext(discoverContextParam);

  if (discoverContextParam === "CAMPAIGN") {
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
      return NextResponse.json(
        { error: sceSelectorDiscoverApiErrorBody(403) },
        { status: 403 },
      );
    }
  } else {
    const access = await requireApiAnyPermission(
      routePermissionsForSelectorAuthorizationContext(authContext),
      tenant.id,
    );
    if (!access.ok) {
      logDiscoverEvent(correlationId, {
        phase: "permissions",
        permissionsResolved: false,
        httpStatus: access.status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: sceSelectorDiscoverApiErrorBody(access.status) },
        { status: access.status },
      );
    }
  }

  const capabilities = await resolveCommunicationAudienceCapabilities({
    tenantId: tenant.id,
    userId,
    context,
    discoverContext: discoverContextParam,
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
      discoverContext: discoverContextParam,
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
      { error: sceSelectorDiscoverApiErrorBody(500), groups: [] },
      { status: 500 },
    );
  }
}
