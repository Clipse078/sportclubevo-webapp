import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export type ClubEventFreigabenUnauthorizedReason =
  | "MISSING_APPROVE_PERMISSION"
  | "NOT_IN_VALIDATOR_POOL"
  | "NO_PERSON_LINK";

export type ClubEventFreigabenAccess =
  | {
      kind: "authorized";
      personId: string;
      validatorPersonIds: readonly string[];
    }
  | {
      kind: "unauthorized";
      reason: ClubEventFreigabenUnauthorizedReason;
    };

export function tenantHasPermission(
  platform: readonly PermissionKey[],
  tenant: readonly PermissionKey[],
  permissionKey: PermissionKey,
): boolean {
  return platform.includes(permissionKey) || tenant.includes(permissionKey);
}

export function resolveClubEventFreigabenAccessFromContext(input: {
  platformPermissions: readonly PermissionKey[];
  tenantPermissions: readonly PermissionKey[];
  personId: string | null;
  validatorPersonIds: readonly string[];
}): ClubEventFreigabenAccess {
  const heldApprove = tenantHasPermission(
    input.platformPermissions,
    input.tenantPermissions,
    PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE,
  );

  if (!heldApprove) {
    return { kind: "unauthorized", reason: "MISSING_APPROVE_PERMISSION" };
  }

  if (!input.personId) {
    return { kind: "unauthorized", reason: "NO_PERSON_LINK" };
  }

  if (!input.validatorPersonIds.includes(input.personId)) {
    return { kind: "unauthorized", reason: "NOT_IN_VALIDATOR_POOL" };
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
