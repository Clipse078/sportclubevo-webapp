/**
 * Read-only contributor role sync projection for FC Allschwil VL invitations.
 */

import {
  FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE,
  PILOT_TENANT_KEY,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VL_ROLE_CAPABILITY_FLAGS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import type { PermissionKey } from "@/lib/permissions/permissions";

export const FCA_VL_CONTRIBUTOR_ROLE_STABLE_KEY = FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey;
export const FCA_VL_CONTRIBUTOR_ROLE_STABLE_NAME = FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.name;
export const FCA_VL_CONTRIBUTOR_TENANT_KEY = PILOT_TENANT_KEY;

/** Exact eight permission keys for the VL contributor preset (stable PO review contract). */
export const VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS = [
  ...FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys,
] as const;

export type VlContributorRoleSnapshot = {
  id?: string;
  scope?: string;
  tenantId?: string | null;
  permissionKeys: readonly string[];
  canAccessVereinsleitung: boolean;
  canAttendVereinsleitungMeetings: boolean;
  assignmentCount?: number;
  duplicateTenantScopedRoleId?: string | null;
} | null;

export type VlContributorRoleScopeRepairPlan = {
  tenantKey: typeof FCA_VL_CONTRIBUTOR_TENANT_KEY;
  stableRoleKey: typeof FCA_VL_CONTRIBUTOR_ROLE_STABLE_KEY;
  stableRoleName: typeof FCA_VL_CONTRIBUTOR_ROLE_STABLE_NAME;
  roleId: string | null;
  roleMissing: boolean;
  beforeScope: string | null;
  afterScope: "TENANT";
  scopeRepairNeeded: boolean;
  wouldCreateDuplicate: boolean;
  ownershipAmbiguous: boolean;
  assignmentCount: number;
  permissionKeysBefore: readonly string[];
  permissionKeysAfter: readonly string[];
  gatesBefore: {
    canAccessVereinsleitung: boolean;
    canAttendVereinsleitungMeetings: boolean;
  };
  gatesAfter: typeof FCA_VL_ROLE_CAPABILITY_FLAGS;
  wouldApplyInPlace: boolean;
  syncDiff: VlContributorRoleSyncDiff;
};

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

export function buildVlContributorRoleScopeRepairPlan(
  existing: VlContributorRoleSnapshot,
): VlContributorRoleScopeRepairPlan {
  const syncDiff = buildVlContributorRoleSyncDiff(existing);
  const roleMissing = existing === null;
  const beforeScope = existing?.scope ?? null;
  const scopeRepairNeeded = !roleMissing && beforeScope !== "TENANT";
  const duplicateTenantScopedRoleId = existing?.duplicateTenantScopedRoleId ?? null;
  const wouldCreateDuplicate = Boolean(
    scopeRepairNeeded && duplicateTenantScopedRoleId && duplicateTenantScopedRoleId !== existing?.id,
  );
  const ownershipAmbiguous = wouldCreateDuplicate;

  return {
    tenantKey: FCA_VL_CONTRIBUTOR_TENANT_KEY,
    stableRoleKey: FCA_VL_CONTRIBUTOR_ROLE_STABLE_KEY,
    stableRoleName: FCA_VL_CONTRIBUTOR_ROLE_STABLE_NAME,
    roleId: existing?.id ?? null,
    roleMissing,
    beforeScope,
    afterScope: "TENANT",
    scopeRepairNeeded,
    wouldCreateDuplicate,
    ownershipAmbiguous,
    assignmentCount: existing?.assignmentCount ?? 0,
    permissionKeysBefore: existing?.permissionKeys ?? [],
    permissionKeysAfter: VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS,
    gatesBefore: {
      canAccessVereinsleitung: existing?.canAccessVereinsleitung ?? false,
      canAttendVereinsleitungMeetings: existing?.canAttendVereinsleitungMeetings ?? false,
    },
    gatesAfter: FCA_VL_ROLE_CAPABILITY_FLAGS,
    wouldApplyInPlace:
      !ownershipAmbiguous &&
      (syncDiff.wouldApply || scopeRepairNeeded) &&
      !wouldCreateDuplicate,
    syncDiff,
  };
}