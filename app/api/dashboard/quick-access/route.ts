import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { loadPersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import { resolvePersonalContext } from "@/lib/dashboard/personal-context";
import { getDashboardQuickAccessActorContext } from "@/lib/dashboard/quick-access/server-context";
import {
  buildQuickAccessCatalog,
  QUICK_ACCESS_MAX_PINS,
} from "@/lib/dashboard/quick-access";
import {
  loadStoredQuickAccessPinnedKeys,
  resetQuickAccessPreference,
  resolveQuickAccessItemsFromKeys,
  resolveVisibleQuickAccessKeys,
  saveQuickAccessPreference,
} from "@/lib/dashboard/quick-access/preference-service";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { filterStoredKeysToAuthorized } from "@/lib/dashboard/quick-access/validation";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const dynamic = "force-dynamic";

async function loadCatalogContext(userId: string, tenantId: string, permissionKeys: PermissionKey[]) {
  const personalActionsCaps = await loadPersonalActionsModuleCapabilities({
    tenantId,
    userId,
    permissionKeys,
  });
  return {
    permissionKeys,
    navCapabilities: {
      personalActionsModule: personalActionsCaps.moduleAccess,
    },
  };
}

export async function GET(): Promise<NextResponse> {
  const actor = await getDashboardQuickAccessActorContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await getActiveTenant();
  const locale = tenant?.locale ?? "de-CH";
  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    actor.userId,
    actor.tenantId,
  );
  const permissionKeys = [...platform, ...tenantPerms] as PermissionKey[];

  const catalogContext = await loadCatalogContext(
    actor.userId,
    actor.tenantId,
    permissionKeys,
  );
  const catalog = buildQuickAccessCatalog(catalogContext);
  const catalogByKey = new Map(catalog.map((entry) => [entry.key, entry]));
  const authorizedKeys = new Set(catalog.map((entry) => entry.key));

  const [stored, personalContext] = await Promise.all([
    loadStoredQuickAccessPinnedKeys(actor.tenantId, actor.userId),
    resolvePersonalContext({ tenantId: actor.tenantId, userId: actor.userId }),
  ]);

  const activeKeys = resolveVisibleQuickAccessKeys({
    catalog,
    storedPinnedKeys: stored.pinnedKeys,
    hasStoredPreference: stored.hasStoredPreference,
    personalContext,
  });

  const labelResolver = (entry: (typeof catalog)[number]) =>
    getQuickAccessLabel(entry, locale);

  const items = resolveQuickAccessItemsFromKeys(activeKeys, catalogByKey, labelResolver);

  const accessibleStoredKeys = filterStoredKeysToAuthorized(
    stored.pinnedKeys,
    authorizedKeys,
  );

  const customizeCatalog = catalog.map((entry) => ({
    key: entry.key,
    kind: entry.kind === "CREATE_ACTION" ? ("create" as const) : ("navigate" as const),
    label: labelResolver(entry),
    href: entry.href,
  }));

  return NextResponse.json({
    items,
    activeKeys,
    accessibleStoredKeys,
    hasStoredPreference: stored.hasStoredPreference,
    maxPins: QUICK_ACCESS_MAX_PINS,
    customizeCatalog,
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const actor = await getDashboardQuickAccessActorContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { pinnedKeys?: unknown; tenantId?: string };
  if (body.tenantId && body.tenantId !== actor.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    actor.userId,
    actor.tenantId,
  );
  const permissionKeys = [...platform, ...tenantPerms] as PermissionKey[];
  const catalogContext = await loadCatalogContext(
    actor.userId,
    actor.tenantId,
    permissionKeys,
  );

  const result = await saveQuickAccessPreference(
    actor.tenantId,
    actor.userId,
    (body.pinnedKeys ?? []) as string[],
    catalogContext,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.code, message: result.message }, { status: 400 });
  }

  return GET();
}

export async function DELETE(): Promise<NextResponse> {
  const actor = await getDashboardQuickAccessActorContext();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await resetQuickAccessPreference(actor.tenantId, actor.userId);
  return GET();
}
