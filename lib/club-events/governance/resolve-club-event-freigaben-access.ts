import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export type ClubEventFreigabenUnauthorizedReason =
  | "MISSING_APPROVE_PERMISSION"
  | "NOT_IN_VALIDATOR_POOL"
  | "NO_PERSON_LINK";

/** Role-aware unauthorized presentation (approval vs governance administration). */
export type ClubEventFreigabenUnauthorizedDisplay =
  | "STANDARD"
  | "GOVERNANCE_ADMIN_NON_VALIDATOR";

export type ClubEventFreigabenAccess =
  | {
      kind: "authorized";
      personId: string;
      validatorPersonIds: readonly string[];
    }
  | {
      kind: "unauthorized";
      reason: ClubEventFreigabenUnauthorizedReason;
      display: ClubEventFreigabenUnauthorizedDisplay;
    };

export function tenantHasPermission(
  platform: readonly PermissionKey[],
  tenant: readonly PermissionKey[],
  permissionKey: PermissionKey,
): boolean {
  return platform.includes(permissionKey) || tenant.includes(permissionKey);
}

/**
 * Governance administration for Club Events (validator pool, create/publish rules).
 * Matches Personen & Zugänge manage affordances — not platform-only `users.manage`.
 */
export function tenantCanAdministerClubEventGovernance(
  platformPermissions: readonly PermissionKey[],
  tenantPermissions: readonly PermissionKey[],
): boolean {
  return (
    tenantHasPermission(platformPermissions, tenantPermissions, PERMISSIONS.USERS_MANAGE) ||
    tenantHasPermission(
      platformPermissions,
      tenantPermissions,
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
    )
  );
}

function resolveFreigabenUnauthorizedDisplay(input: {
  reason: ClubEventFreigabenUnauthorizedReason;
  canManageGovernance: boolean;
}): ClubEventFreigabenUnauthorizedDisplay {
  if (!input.canManageGovernance) {
    return "STANDARD";
  }
  if (input.reason === "NO_PERSON_LINK") {
    return "STANDARD";
  }
  return "GOVERNANCE_ADMIN_NON_VALIDATOR";
}

export function resolveClubEventFreigabenAccessFromContext(input: {
  platformPermissions: readonly PermissionKey[];
  tenantPermissions: readonly PermissionKey[];
  personId: string | null;
  validatorPersonIds: readonly string[];
  canManageGovernance?: boolean;
}): ClubEventFreigabenAccess {
  const canManageGovernance =
    input.canManageGovernance ??
    tenantCanAdministerClubEventGovernance(
      input.platformPermissions,
      input.tenantPermissions,
    );
  const heldApprove = tenantHasPermission(
    input.platformPermissions,
    input.tenantPermissions,
    PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE,
  );

  if (!heldApprove) {
    return {
      kind: "unauthorized",
      reason: "MISSING_APPROVE_PERMISSION",
      display: resolveFreigabenUnauthorizedDisplay({
        reason: "MISSING_APPROVE_PERMISSION",
        canManageGovernance,
      }),
    };
  }

  if (!input.personId) {
    return {
      kind: "unauthorized",
      reason: "NO_PERSON_LINK",
      display: "STANDARD",
    };
  }

  if (!input.validatorPersonIds.includes(input.personId)) {
    return {
      kind: "unauthorized",
      reason: "NOT_IN_VALIDATOR_POOL",
      display: resolveFreigabenUnauthorizedDisplay({
        reason: "NOT_IN_VALIDATOR_POOL",
        canManageGovernance,
      }),
    };
  }

  return {
    kind: "authorized",
    personId: input.personId,
    validatorPersonIds: input.validatorPersonIds,
  };
}

export function clubEventFreigabenMayShowDecisionForm(input: {
  access: ClubEventFreigabenAccess;
  creatorPersonId: string;
}): boolean {
  if (input.access.kind !== "authorized") {
    return false;
  }
  return input.access.personId !== input.creatorPersonId;
}
