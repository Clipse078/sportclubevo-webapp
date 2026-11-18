import { redirect } from "next/navigation";
import { resolveRequestAnyPermission } from "@/lib/permissions/resolve-request-any-permission";
import type { PermissionKey } from "@/lib/permissions/permissions";

/**
 * RPERM-04 — Authoritative "any of" permission gate.
 *
 * See requirePermission() for the resolution model. Grants access when the
 * user holds at least one of `permissionKeys` in either the platform or the
 * tenant (`tenantId` ?? session.activeTenantId) bucket.
 */
export async function requireAnyPermission(permissionKeys: PermissionKey[], tenantId?: string) {
  const access = await resolveRequestAnyPermission(permissionKeys, tenantId);

  if (access.kind === "unauthenticated") {
    redirect("/login");
  }

  if (access.kind === "forbidden") {
    redirect("/dashboard");
  }

  return access.session;
}
