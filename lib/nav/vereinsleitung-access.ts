import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

/**
 * Strategic entity permissions used by Vereinsentwicklung navigation.
 * Visibility also requires `Role.canAccessVereinsleitung` (see nav capability).
 */
export const VEREINSLEITUNG_STRATEGIC_ENTITY_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.TARGETS_VIEW,
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
  PERMISSIONS.INITIATIVES_VIEW,
  PERMISSIONS.INITIATIVES_MANAGE,
];

/** Demo/mock Vereinsleitung surfaces (finanzen, material, prozesse) — not for pilot viewers. */
export const VEREINSLEITUNG_DEMO_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_MANAGE,
];

/** Strategic Vereinsleitung navigation (meetings, club entwicklung). */
export const VEREINSLEITUNG_STRATEGIC_VIEW_PERMISSIONS: PermissionKey[] = [
  ...VEREINSLEITUNG_STRATEGIC_ENTITY_PERMISSIONS,
];
