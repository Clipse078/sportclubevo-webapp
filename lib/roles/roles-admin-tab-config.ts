import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type RolesAdminTabId = "roles" | "assignments" | "effective-access";

export const ROLES_ADMIN_TAB_ROUTES: Record<RolesAdminTabId, string> = {
  roles: "/dashboard/administration/roles",
  assignments: "/dashboard/administration/roles/assignments",
  "effective-access": "/dashboard/administration/roles/effective-access",
};

export function resolveRolesAdminTabFromPathname(pathname: string): RolesAdminTabId {
  if (pathname.includes("/assignments")) {
    return "assignments";
  }
  if (pathname.includes("/effective-access")) {
    return "effective-access";
  }
  return "roles";
}

export function buildRolesAdminTabNavigationConfig(): ContextTabNavigationConfig<RolesAdminTabId> {
  return {
    contextKind: "ROLES_ADMIN",
    defaultTab: "roles",
    tabRoutes: ROLES_ADMIN_TAB_ROUTES,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      const resolved = resolveRolesAdminTabFromPathname(pathname);
      return visibleKeys.includes(resolved) ? resolved : null;
    },
    tabs: [
      { key: "roles", label: "Rollen", placement: "primary" },
      { key: "assignments", label: "Benutzerzuweisungen", placement: "primary" },
      { key: "effective-access", label: "Effektiver Zugriff", placement: "primary" },
    ],
  };
}
