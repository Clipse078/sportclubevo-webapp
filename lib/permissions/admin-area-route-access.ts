import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

type AdminAreaRouteRule = {
  prefix: string;
  permissionKeys: PermissionKey[];
};

/**
 * Platform-scoped admin routes under `/dashboard/admin/**` that must not require
 * tenant Club Admin authority (billing, cross-tenant tenants, platform integrations).
 */
const PLATFORM_ADMIN_AREA_ROUTE_RULES: AdminAreaRouteRule[] = [
  {
    prefix: "/dashboard/admin/commercial",
    permissionKeys: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_MANAGE],
  },
  {
    prefix: "/dashboard/admin/tenants",
    permissionKeys: [PERMISSIONS.TENANTS_VIEW, PERMISSIONS.TENANTS_MANAGE],
  },
  {
    prefix: "/dashboard/admin/integrations",
    permissionKeys: [PERMISSIONS.TENANTS_MANAGE],
  },
];

/** Permission keys required to enter a pathname under `/dashboard/admin`. */
export function resolveAdminAreaRoutePermissionKeys(pathname: string): PermissionKey[] {
  for (const rule of PLATFORM_ADMIN_AREA_ROUTE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.permissionKeys;
    }
  }
  return [...TENANT_ADMINISTRATION_PERMISSIONS];
}
