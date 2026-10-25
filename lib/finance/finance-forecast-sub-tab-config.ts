import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type FinanceForecastSubTabId = "current" | "scenarios" | "timing";

export function buildFinanceForecastSubTabNavigationConfig(input: {
  labels: {
    current: string;
    scenarios: string;
    timing: string;
  };
}): ContextTabNavigationConfig<FinanceForecastSubTabId> {
  const tabRoutes: Record<FinanceForecastSubTabId, string> = {
    current: "/dashboard/finance/forecast",
    scenarios: "/dashboard/finance/forecast/scenarios",
    timing: "/dashboard/finance/forecast/timing",
  };

  return {
    contextKind: "FINANCE_FORECAST_SUB",
    defaultTab: "current",
    tabRoutes,
    resolveActiveTabFromPathname: (pathname) => {
      if (pathname.startsWith("/dashboard/finance/forecast/scenarios")) {
        return "scenarios";
      }
      if (pathname.startsWith("/dashboard/finance/forecast/timing")) {
        return "timing";
      }
      if (pathname.startsWith("/dashboard/finance/forecast")) {
        return "current";
      }
      return null;
    },
    tabs: [
      { key: "current", label: input.labels.current, placement: "primary" },
      { key: "scenarios", label: input.labels.scenarios, placement: "primary" },
      { key: "timing", label: input.labels.timing, placement: "primary" },
    ],
  };
}
