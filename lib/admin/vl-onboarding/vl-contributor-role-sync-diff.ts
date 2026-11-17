/**
 * Read-only contributor role sync projection for FC Allschwil VL invitations.
 */

import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_ROLE_CAPABILITY_FLAGS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import type { PermissionKey } from "@/lib/permissions/permissions";

/** Exact eight permission keys for the VL contributor preset (stable PO review contract). */
export const VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS = [
  ...FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys,
] as const;

export type VlContributorRoleSnapshot = {
  permissionKeys: readonly string[];
  canAccessVereinsleitung: boolean;
  canAttendVereinsleitungMeetings: boolean;
} | null;

export type VlContributorRoleSyncDiff = {
  roleKey: string;
  roleName: string;
  permissionKeys: readonly string[];
  roleMissing: boolean;
  missingPermissionKeys: string[];
  extraPermissionKeys: string[];
  roleCapabilityFlags: typeof FCA_VL_ROLE_CAPABILITY_FLAGS;
  needsVlCapabilityFlags: boolean;
  wouldApply: boolean;
};

export function buildVlContributorRoleSyncDiff(
  existing: VlContributorRoleSnapshot,
): VlContributorRoleSyncDiff {
  const target = [...VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS];
  const current = existing ? [...existing.permissionKeys] : [];
  const currentSet = new Set(current);
  const targetSet = new Set(target);
  const missingPermissionKeys: PermissionKey[] = target.filter((k) => !currentSet.has(k));
  const extraPermissionKeys = current.filter(
    (k): k is PermissionKey => !targetSet.has(k as PermissionKey),
  );
  const roleMissing = existing === null;
  const needsVlCapabilityFlags =
    existing === null ||
    !existing.canAccessVereinsleitung ||
    !existing.canAttendVereinsleitungMeetings;

  return {
    roleKey: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey,
    roleName: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name,
    permissionKeys: VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS,
    roleMissing,
    missingPermissionKeys,
    extraPermissionKeys,
    roleCapabilityFlags: FCA_VL_ROLE_CAPABILITY_FLAGS,
    needsVlCapabilityFlags,
    wouldApply: roleMissing || missingPermissionKeys.length > 0 || needsVlCapabilityFlags,
  };
}