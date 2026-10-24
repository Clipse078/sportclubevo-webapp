import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type FinanceForecastSubTabId = "current" | "scenarios";

export function buildFinanceForecastSubTabNavigationConfig(input: {
  labels: {
    current: string;
    scenarios: string;
  };
}): ContextTabNavigationConfig<FinanceForecastSubTabId> {
  const tabRoutes: Record<FinanceForecastSubTabId, string> = {
    current: "/dashboard/finance/forecast",
    scenarios: "/dashboard/finance/forecast/scenarios",
  };

  return {
    contextKind: "FINANCE_FORECAST_SUB",
    defaultTab: "current",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname) => {
      if (pathname.startsWith("/dashboard/finance/forecast/scenarios")) {
        return "scenarios";
      }
      if (pathname.startsWith("/dashboard/finance/forecast")) {
        return "current";
      }
      return null;
    },
    tabs: [
      { key: "current", label: input.labels.current, placement: "primary" },
      { key: "scenarios", label: input.labels.scenarios, placement: "primary" },
    ],
  };
}
