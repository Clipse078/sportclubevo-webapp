import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { RequirementServiceContext } from "./types";
import { hasRequirementPermission } from "./requirement-authorization";

/** Management workspace (list/create) — not granted to recipient-only users. */
export function canAccessRequirementManagement(ctx: RequirementServiceContext): boolean {
  return (
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_CREATE) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_MANAGE) ||
    hasRequirementPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE)
  );
}

export function canAccessRequirementManagementFromKeys(permissionKeys: readonly string[]): boolean {
  return canAccessRequirementManagement({
    tenantId: "",
    userId: "",
    permissionKeys,
  });
}
