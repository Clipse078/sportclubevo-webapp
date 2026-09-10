import type { TenantStatus } from "@prisma/client";

/** Tenants that allow normal member access and tenant-scoped permissions. */
export function isTenantOperationallyAccessible(status: TenantStatus | string): boolean {
  return status === "ACTIVE";
}
