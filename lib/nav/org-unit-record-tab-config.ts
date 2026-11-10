import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type OrgUnitRecordTabId = "overview" | "edit" | "history";

export function buildOrgUnitRecordTabNavigationConfig(
  orgUnitId: string,
  options?: { showEdit?: boolean },
): ContextTabNavigationConfig<OrgUnitRecordTabId> {
  const base = `/dashboard/org-units/${orgUnitId}`;
  const showEdit = options?.showEdit !== false;
  return {
    contextKind: "ORG_UNIT_RECORD",
    defaultTab: "overview",
    tabRoutes: {
      overview: base,
      edit: `${base}/edit`,
      history: `${base}/history`,
    },
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname.endsWith("/history")) {
        return visibleKeys.includes("history") ? "history" : null;
      }
      if (pathname.endsWith("/edit")) {
        return visibleKeys.includes("edit") ? "edit" : null;
      }
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        return visibleKeys.includes("overview") ? "overview" : null;
      }
      return null;
    },
    tabs: [
      { key: "overview", label: "Übersicht", placement: "primary" },
      ...(showEdit
        ? [{ key: "edit" as const, label: "Bearbeiten", placement: "primary" as const }]
        : []),
      { key: "history", label: "Verlauf", placement: "primary" },
    ],
  };
}
