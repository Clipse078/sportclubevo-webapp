/**
 * PR #1025 — Dokumentation hub + navigation route access (live RBAC, additive roles).
 */

import { getRequestAuthSession } from "@/lib/auth/get-request-auth-session";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveRequestAnyPermission } from "@/lib/permissions/resolve-request-any-permission";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { hasTenantDocumentationModuleView } from "@/lib/tenant-documentation/authorization";

/** Users who may open the Dokumentation hub or any documentation page route. */
export const TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS = [
  PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
  PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
] as const satisfies readonly PermissionKey[];

export type TenantDocumentationHubRouteAccess =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "no_tenant_context" }
  | {
      kind: "granted";
      session: NonNullable<Awaited<ReturnType<typeof getRequestAuthSession>>>;
      tenantId: string;
      actorUserId: string;
      permissionKeys: readonly string[];
    };

export function tenantDocumentationNavVisible(permissionKeys: readonly PermissionKey[]): boolean {
  return hasTenantDocumentationModuleView(permissionKeys);
}

/**
 * Same live evaluation used by hub/detail routes and shell navigation parity tests.
 * Never redirects — callers render explicit denial or call redirect("/login") for guests.
 */
export async function resolveTenantDocumentationHubRouteAccess(): Promise<TenantDocumentationHubRouteAccess> {
  const session = await getRequestAuthSession();
  if (!session?.user) {
    return { kind: "unauthenticated" };
  }

  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const activeTenantId = session.user.activeTenantId ?? undefined;

  const permissionAccess = await resolveRequestAnyPermission(
    [...TENANT_DOCUMENTATION_HUB_ROUTE_PERMISSIONS],
    activeTenantId,
  );

  if (permissionAccess.kind === "unauthenticated") {
    return { kind: "unauthenticated" };
  }

  if (permissionAccess.kind === "forbidden") {
    return { kind: "forbidden" };
  }

  const tenant = await getActiveTenant();
  if (!tenant?.id) {
    return { kind: "no_tenant_context" };
  }

  const effective = await getRequestEffectivePermissions(actorUserId, tenant.id);
  const permissionKeys = [...effective.platform, ...effective.tenant];

  if (!hasTenantDocumentationModuleView(permissionKeys)) {
    return { kind: "forbidden" };
  }

  return {
    kind: "granted",
    session: permissionAccess.session,
    tenantId: tenant.id,
    actorUserId,
    permissionKeys,
  };
}
