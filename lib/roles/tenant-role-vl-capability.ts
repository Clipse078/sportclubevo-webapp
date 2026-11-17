import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";

const MEETING_ATTENDANCE_PERMISSION_KEYS = [
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
] as const;

/**
 * Materialises Role.canAccessVereinsleitung / canAttendVereinsleitungMeetings from
 * delegated permission keys when tenant admins save Vereinsentwicklung rows.
 */
export function deriveTenantRoleVereinsleitungCapabilityFlags(permissionKeys: readonly string[]): {
  canAccessVereinsleitung: boolean;
  canAttendVereinsleitungMeetings: boolean;
} {
  const set = new Set(permissionKeys);
  const canAccessVereinsleitung = FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS.some((key) =>
    set.has(key),
  );
  const canAttendVereinsleitungMeetings = MEETING_ATTENDANCE_PERMISSION_KEYS.some((key) =>
    set.has(key),
  );
  return { canAccessVereinsleitung, canAttendVereinsleitungMeetings };
}