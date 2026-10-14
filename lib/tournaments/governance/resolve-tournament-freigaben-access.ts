import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { tenantCanAdministerClubEventGovernance } from "@/lib/club-events/governance/resolve-club-event-freigaben-access";

export type TournamentFreigabenAccess =
  | { kind: "authorized"; personId: string; validatorPersonIds: readonly string[] }
  | {
      kind: "unauthorized";
      reason: "MISSING_APPROVE_PERMISSION" | "NOT_IN_VALIDATOR_POOL" | "NO_PERSON_LINK";
      display: "STANDARD" | "GOVERNANCE_ADMIN_NON_VALIDATOR";
    };

function tenantHasPermission(
  platform: readonly PermissionKey[],
  tenant: readonly PermissionKey[],
  permissionKey: PermissionKey,
): boolean {
  return platform.includes(permissionKey) || tenant.includes(permissionKey);
}

export function tournamentFreigabenMayShowDecisionForm(input: {
  access: Extract<TournamentFreigabenAccess, { kind: "authorized" }>;
  creatorPersonId: string;
}): boolean {
  return input.access.personId !== input.creatorPersonId;
}

export function resolveTournamentFreigabenAccessFromContext(input: {
  platformPermissions: readonly PermissionKey[];
  tenantPermissions: readonly PermissionKey[];
  personId: string | null;
  validatorPersonIds: readonly string[];
}): TournamentFreigabenAccess {
  const canManageGovernance = tenantCanAdministerClubEventGovernance(
    input.platformPermissions,
    input.tenantPermissions,
  );
  const heldApprove = tenantHasPermission(
    input.platformPermissions,
    input.tenantPermissions,
    PERMISSIONS.ACTIVITIES_TOURNAMENT_APPROVE,
  );

  if (!heldApprove) {
    return {
      kind: "unauthorized",
      reason: "MISSING_APPROVE_PERMISSION",
      display: canManageGovernance ? "GOVERNANCE_ADMIN_NON_VALIDATOR" : "STANDARD",
    };
  }

  if (!input.personId) {
    return { kind: "unauthorized", reason: "NO_PERSON_LINK", display: "STANDARD" };
  }

  if (!input.validatorPersonIds.includes(input.personId)) {
    return {
      kind: "unauthorized",
      reason: "NOT_IN_VALIDATOR_POOL",
      display: canManageGovernance ? "GOVERNANCE_ADMIN_NON_VALIDATOR" : "STANDARD",
    };
  }

  return {
    kind: "authorized",
    personId: input.personId,
    validatorPersonIds: input.validatorPersonIds,
  };
}
