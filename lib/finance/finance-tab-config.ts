import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type FinanceWorkspaceTabId =
  | "overview"
  | "structure"
  | "reporting"
  | "budget"
  | "actuals"
  | "forecast"
  | "commitments"
  | "settings";

export function buildFinanceTabNavigationConfig(input: {
  showStructure: boolean;
  showReporting: boolean;
  showBudget: boolean;
  showActuals: boolean;
  showForecast: boolean;
  showCommitments: boolean;
  showSettings: boolean;
  labels: {
    overview: string;
    structure: string;
    reporting: string;
    budget: string;
    actuals: string;
    forecast: string;
    commitments: string;
    settings: string;
  };
}): ContextTabNavigationConfig<FinanceWorkspaceTabId> {
  const tabRoutes: Record<FinanceWorkspaceTabId, string> = {
    overview: "/dashboard/finance",
    structure: "/dashboard/finance/structure",
    reporting: "/dashboard/finance/reports",
    budget: "/dashboard/finance/budget",
    actuals: "/dashboard/finance/actuals",
    forecast: "/dashboard/finance/forecast",
    commitments: "/dashboard/finance/commitments",
    settings: "/dashboard/finance/settings",
  };

  const tabs: ContextTabNavigationConfig<FinanceWorkspaceTabId>["tabs"] = [
    { key: "overview", label: input.labels.overview, placement: "primary" },
  ];
  if (input.showStructure) {
    tabs.push({ key: "structure", label: input.labels.structure, placement: "primary" });
  }
  if (input.showReporting) {
    tabs.push({ key: "reporting", label: input.labels.reporting, placement: "primary" });
  }
  if (input.showBudget) {
    tabs.push({ key: "budget", label: input.labels.budget, placement: "primary" });
  }
  if (input.showActuals) {
    tabs.push({ key: "actuals", label: input.labels.actuals, placement: "primary" });
  }
  if (input.showForecast) {
    tabs.push({ key: "forecast", label: input.labels.forecast, placement: "primary" });
  }
  if (input.showCommitments) {
    tabs.push({ key: "commitments", label: input.labels.commitments, placement: "primary" });
  }
  if (input.showSettings) {
    tabs.push({ key: "settings", label: input.labels.settings, placement: "primary" });
  }

  return {
    contextKind: "FINANCE_WORKSPACE",
    defaultTab: "overview",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      if (pathname.startsWith("/dashboard/finance/structure")) {
        return visibleKeys.includes("structure") ? "structure" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/reports")) {
        return visibleKeys.includes("reporting") ? "reporting" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/budget")) {
        return visibleKeys.includes("budget") ? "budget" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/actuals")) {
        return visibleKeys.includes("actuals") ? "actuals" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/forecast")) {
        return visibleKeys.includes("forecast") ? "forecast" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/commitments")) {
        return visibleKeys.includes("commitments") ? "commitments" : "overview";
      }
      if (pathname.startsWith("/dashboard/finance/settings")) {
        return visibleKeys.includes("settings") ? "settings" : "overview";
      }
      return visibleKeys.includes("overview") ? "overview" : null;
    },
    tabs,
  };
}
