import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type GovernanceWorkspaceTabId = "roles" | "permissions";

export function buildGovernanceWorkspaceTabNavigationConfig(): ContextTabNavigationConfig<GovernanceWorkspaceTabId> {
  return {
    contextKind: "GOVERNANCE_WORKSPACE",
    defaultTab: "roles",
    tabRoutes: {
      roles: "/dashboard/roles",
      permissions: "/dashboard/permissions",
    },
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname === "/dashboard/permissions" || pathname.startsWith("/dashboard/permissions/")) {
        return visibleKeys.includes("permissions") ? "permissions" : null;
      }
      if (pathname === "/dashboard/roles" || pathname.startsWith("/dashboard/roles/")) {
        return visibleKeys.includes("roles") ? "roles" : null;
      }
      return null;
    },
    tabs: [
      { key: "roles", label: "Rollen", placement: "primary" },
      { key: "permissions", label: "Berechtigungen", placement: "primary" },
    ],
  };
}
