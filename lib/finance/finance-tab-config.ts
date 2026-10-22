import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type FinanceWorkspaceTabId = "overview" | "settings";

export function buildFinanceTabNavigationConfig(input: {
  showSettings: boolean;
  labels: { overview: string; settings: string };
}): ContextTabNavigationConfig<FinanceWorkspaceTabId> {
  const tabRoutes: Record<FinanceWorkspaceTabId, string> = {
    overview: "/dashboard/finance",
    settings: "/dashboard/finance/settings",
  };

  const tabs: ContextTabNavigationConfig<FinanceWorkspaceTabId>["tabs"] = [
    { key: "overview", label: input.labels.overview, placement: "primary" },
  ];
  if (input.showSettings) {
    tabs.push({ key: "settings", label: input.labels.settings, placement: "primary" });
  }

  return {
    contextKind: "FINANCE_WORKSPACE",
    defaultTab: "overview",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname.startsWith("/dashboard/finance/settings")) {
        return visibleKeys.includes("settings") ? "settings" : "overview";
      }
      return visibleKeys.includes("overview") ? "overview" : null;
    },
    tabs,
  };
}
