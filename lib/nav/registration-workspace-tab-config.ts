import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type RegistrationWorkspaceTabId = "inbox" | "waiting" | "archive";

export function buildRegistrationWorkspaceTabNavigationConfig(
  tenantSlug: string,
): ContextTabNavigationConfig<RegistrationWorkspaceTabId> {
  const base = `/tenant/${tenantSlug}/cockpit/registrations`;
  return {
    contextKind: "REGISTRATION_WORKSPACE",
    defaultTab: "inbox",
    tabRoutes: {
      inbox: base,
      waiting: `${base}/warteliste`,
      archive: `${base}/archiv`,
    },
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname.includes("/registrations/archiv")) {
        return visibleKeys.includes("archive") ? "archive" : null;
      }
      if (pathname.includes("/registrations/warteliste")) {
        return visibleKeys.includes("waiting") ? "waiting" : null;
      }
      if (pathname.includes("/registrations")) {
        return visibleKeys.includes("inbox") ? "inbox" : null;
      }
      return null;
    },
    tabs: [
      { key: "inbox", label: "Eingang", placement: "primary" },
      { key: "waiting", label: "Warteliste", placement: "primary" },
      { key: "archive", label: "Archiv", placement: "primary" },
    ],
  };
}
