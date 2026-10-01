/**
 * SCE-PERF-DASHBOARD-02 — projection read path gate.
 * Disabled only for explicit diagnostics comparing legacy aggregation.
 */
export function personalDashboardReadModelEnabled(): boolean {
  return process.env.SCE_PERF_DASHBOARD_02 !== "0";
}

export function personalDashboardLegacyAggregationAllowed(): boolean {
  return process.env.SCE_PERF_DASHBOARD_02 === "0";
}
