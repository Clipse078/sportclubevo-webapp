import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Server gate for tenant-scoped Club Admin routes and navigation. */
export async function requireTenantAdministration() {
  return requireAnyPermission([...TENANT_ADMINISTRATION_PERMISSIONS]);
}
