import { PLATFORM_SUPERADMIN_ROLE_KEY } from "@/lib/security/platform-superadmin";

const PLATFORM_ROLE_KEYS = new Set([
  PLATFORM_SUPERADMIN_ROLE_KEY,
  "platform_admin",
  "super_admin",
]);

export type PlatformRoleRef = { key: string; scope?: string | null };

/** True when the user holds a platform-scoped identity (support / super admin). */
export function userHasPlatformSystemIdentity(platformRoles: PlatformRoleRef[]): boolean {
  return platformRoles.some(
    (r) =>
      r.scope === "PLATFORM" ||
      PLATFORM_ROLE_KEYS.has(r.key.toLowerCase()),
  );
}
