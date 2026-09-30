import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/** Demo/mock Vereinsleitung surfaces (finanzen, material, prozesse) — not for pilot viewers. */
export const VEREINSLEITUNG_DEMO_PERMISSIONS: PermissionKey[] = [
  ...TENANT_ADMINISTRATION_PERMISSIONS,
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_MANAGE,
];

/** Strategic Vereinsleitung navigation (meetings, club entwicklung). */
export const VEREINSLEITUNG_STRATEGIC_VIEW_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.TARGETS_VIEW,
  PERMISSIONS.TARGETS_MANAGE,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
  PERMISSIONS.INITIATIVES_VIEW,
  PERMISSIONS.INITIATIVES_MANAGE,
  ...TENANT_ADMINISTRATION_PERMISSIONS,
];
