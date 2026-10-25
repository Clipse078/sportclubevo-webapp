import { describe, expect, it } from "vitest";
import {
  FINANCE_05D_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE } from "@/lib/finance/services/finance-overview-decision-intelligence-query-service";

describe("FIN-05D reporting architecture contract", () => {
  it("locks decision intelligence on Übersicht", () => {
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.overviewUsesCanonicalManagementReadModels).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.unscheduledEventsAreNotFakePlotted).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS.timingCoverageIsNotForecastConfidence).toBe(
      true,
    );
  });

  it("names canonical loader and route", () => {
    expect(FINANCE_05D_IMPLEMENTATION.queryLoader).toBe(
      "loadFinanceOverviewDecisionIntelligenceReadModel",
    );
    expect(FINANCE_05D_IMPLEMENTATION.workspaceRoute).toBe("/dashboard/finance");
    expect(FINANCE_05D_IMPLEMENTATION.maxDriversPerSide).toBe(3);
  });

  it("documents query shape guard", () => {
    expect(FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE.reusesManagementOverviewLoader).toBe(
      true,
    );
  });
});
