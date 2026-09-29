import { NextResponse } from "next/server";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";
import { parseSelectorSourceTypesParam } from "@/lib/sce/list-selector/communication-bridge";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import { auth } from "@/auth";
import {
  filterSelectorSourceTypesForAuthorizationContext,
  isSceSelectorAuthorizationContext,
  routePermissionsForSelectorAuthorizationContext,
} from "@/lib/sce/list-selector/selector-authorization-context";
import { selectorAuthorizationContextToSourceContext } from "@/lib/sce/list-selector/selector-source-context";
import { sceSelectorDiscoverApiErrorBody } from "@/lib/sce/list-selector/selector-discover-api-errors";
import type { SceSelectorGroupCursors, SceSelectorSourceType } from "@/lib/sce/list-selector/types";

export const dynamic = "force-dynamic";

function parseCategory(value: string | null): SceSelectorCategoryId {
  if (
    value === "person" ||
    value === "user" ||
    value === "team" ||
    value === "org_unit" ||
    value === "role" ||
    value === "target_group" ||
    value === "external_contact"
  ) {
    return value;
  }
  return "all";
}

function parseGroupCursors(raw: string | null): SceSelectorGroupCursors | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    if (!parsed || typeof parsed !== "object") return undefined;
    const out: SceSelectorGroupCursors = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" || value === null) {
        out[key as SceSelectorSourceType] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

function parseExcludeUserIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Generic SCE selector discover — requires a closed authorization context enum.
 * Feature adapters map UI flows to `authContext`; clients must not pass permission keys.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json(
      { error: sceSelectorDiscoverApiErrorBody(401) },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const authContextParam = url.searchParams.get("authContext");
  if (!isSceSelectorAuthorizationContext(authContextParam)) {
    return NextResponse.json(
      { error: "Ungültiger oder fehlender authContext.", groups: [] },
      { status: 400 },
    );
  }

  const access = await requireApiAnyPermission(
    routePermissionsForSelectorAuthorizationContext(authContextParam),
    tenant.id,
  );
  if (!access.ok) {
    return NextResponse.json(
      { error: sceSelectorDiscoverApiErrorBody(access.status) },
      { status: access.status },
    );
  }

  const query = url.searchParams.get("q") ?? "";
  const category = parseCategory(url.searchParams.get("category"));
  const requestedTypes = parseSelectorSourceTypesParam(url.searchParams.get("sources"));
  const cursors = parseGroupCursors(url.searchParams.get("cursors"));
  const excludeUserIds = parseExcludeUserIds(url.searchParams.get("excludeUserIds"));

  if (!requestedTypes?.length) {
    return NextResponse.json(
      { error: "Ungültige oder fehlende sources.", groups: [] },
      { status: 400 },
    );
  }

  const enabledTypes = filterSelectorSourceTypesForAuthorizationContext({
    context: authContextParam,
    requested: requestedTypes,
  });

  if (enabledTypes.length === 0) {
    return NextResponse.json(
      { error: "Ungültige sources für diesen Kontext.", groups: [] },
      { status: 400 },
    );
  }

  try {
    const groups = await discoverSceSelectorItems({
      tenantId: tenant.id,
      actorUserId: userId,
      enabledTypes,
      category,
      query,
      cursors,
      excludeUserIds,
      communicationContext: selectorAuthorizationContextToSourceContext(authContextParam),
      authorizationContext: authContextParam,
    });
    return NextResponse.json({ groups, noAccess: false });
  } catch {
    return NextResponse.json(
      { error: sceSelectorDiscoverApiErrorBody(500), groups: [] },
      { status: 500 },
    );
  }
}
