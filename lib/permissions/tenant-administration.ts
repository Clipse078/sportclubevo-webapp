import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

/**
 * Tenant-scoped authorities that identify club administrators for navigation
 * and tenant UI gates. Platform `users.manage` is intentionally excluded so
 * platform Super Admins do not inherit tenant module visibility through nav
 * coupling. Route/API authorization for `users.manage` is unchanged.
 */
export const TENANT_ADMINISTRATION_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
];
