/**
 * FC Allschwil — Vereinsleitung workspace capability supplements (SCE-CD-01R2).
 *
 * Operational Spielbetrieb / Präsident baselines do not include strategic entity
 * permissions or Role.canAccessVereinsleitung — both are required for Vereinsentwicklung
 * navigation and API gates in addition to entity permission keys.
 */

import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

/** Minimum strategic entity permissions for VL workspace participation (view + contribute). */
export const FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS: readonly PermissionKey[] = [
  PERMISSIONS.TARGETS_VIEW,
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
  PERMISSIONS.INITIATIVES_VIEW,
  PERMISSIONS.INITIATIVES_MANAGE,
] as const;

export type FcaVlRoleCapabilityFlags = {
  canAccessVereinsleitung: true;
  canAttendVereinsleitungMeetings: true;
};

export const FCA_VL_ROLE_CAPABILITY_FLAGS: FcaVlRoleCapabilityFlags = {
  canAccessVereinsleitung: true,
  canAttendVereinsleitungMeetings: true,
};