import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import { ROLLING_FORECAST_SCENARIO_BOUNDARY } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import { applyScenarioAssumptionV1 } from "@/lib/finance/forecast/scenario-assumption-calculation";
import {
  SCENARIO_AI_BOUNDARY,
  SCENARIO_ASSUMPTION_KINDS_V1,
  SCENARIO_BASELINE_POLICY,
  SCENARIO_COMPARISON_HIERARCHY,
  SCENARIO_NAVIGATION_CONTRACT,
  SCENARIO_PERSISTENCE_PROPOSAL,
  SCENARIO_PERMISSION_CONTRACT,
  SCENARIO_STABILITY_POLICY,
  SCENARIO_TO_CURRENT_FORECAST_ADOPTION,
  SCENARIO_UX_ARCHITECTURE,
  SCENARIO_VERSIONING_DECISION,
  SCE_SCENARIO_ARCHITECTURE_LOCKS,
} from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  SCE_MEASURE_CURRENT_FORECAST,
  SCE_MEASURE_SCENARIO,
  SCE_MEASURE_SCE_PROJECTION,
  SCE_PROJECTION_ARCHITECTURE_LOCKS,
} from "@/lib/finance/projection/projection-architecture-contract";

describe("FIN-04D scenario vs forecast vs projection vs budget", () => {
  it("keeps scenario distinct from all other finance measures", () => {
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.scenarioDistinctFromCurrentForecast).toBe(true);
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.scenarioDistinctFromAutomaticForecast).toBe(true);
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.scenarioDistinctFromFormalReforecast).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.projectionDistinctFromScenario).toBe(true);
    expect(ROLLING_FORECAST_SCENARIO_BOUNDARY.reforecastIsCanonicalExpectation).toBe(true);
    expect(ROLLING_FORECAST_SCENARIO_BOUNDARY.scenarioIsHypotheticalAlternative).toBe(true);
    expect(SCE_MEASURE_SCENARIO).not.toBe(SCE_MEASURE_CURRENT_FORECAST);
    expect(SCE_MEASURE_SCENARIO).not.toBe(SCE_MEASURE_SCE_PROJECTION);
  });

  it("does not silently promote scenario to current forecast", () => {
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.scenarioNeverSilentlyBecomesCurrentForecast).toBe(
      true,
    );
    expect(SCENARIO_TO_CURRENT_FORECAST_ADOPTION.supportedInV1).toBe(false);
    expect(SCENARIO_TO_CURRENT_FORECAST_ADOPTION.neverMutatesApprovedBudget).toBe(true);
  });
});

describe("FIN-04D baseline and stability", () => {
  it("uses hybrid reference + frozen snapshot with current forecast as primary baseline", () => {
    expect(SCENARIO_BASELINE_POLICY.primaryBaselineMeasure).toBe(SCE_MEASURE_CURRENT_FORECAST);
    expect(SCENARIO_BASELINE_POLICY.snapshotStrategy).toBe("REFERENCE_PLUS_FROZEN_BASELINE_LINES");
    expect(SCENARIO_BASELINE_POLICY.dynamicFollowLiveCurrentForecastForbidden).toBe(true);
    expect(SCENARIO_BASELINE_POLICY.v1AllowedStartReferences).toEqual(["CURRENT_FORECAST"]);
    expect(SCENARIO_BASELINE_POLICY.v1ExcludedStartReferences).toEqual(["AUTOMATIC_FORECAST"]);
  });

  it("remains on creation baseline when current forecast revises — no silent rebase", () => {
    expect(SCENARIO_STABILITY_POLICY.onCurrentForecastFormalRevision).toBe(
      "REMAIN_ON_CREATION_BASELINE",
    );
    expect(SCENARIO_STABILITY_POLICY.silentRebaseForbidden).toBe(true);
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.currentForecastChangeNeverSilentlyRebasesScenario).toBe(
      true,
    );
  });
});

describe("FIN-04D assumptions and calculation", () => {
  it("locks v1 assumption kinds", () => {
    expect(SCENARIO_ASSUMPTION_KINDS_V1).toEqual([
      "PERCENT_CHANGE",
      "DELTA_AMOUNT",
      "ABSOLUTE_AMOUNT",
      "EXCLUDE_ACCOUNT",
    ]);
  });

  it("applies percent, delta, absolute, and exclude deterministically in minor units", () => {
    expect(applyScenarioAssumptionV1({ baselineAmountMinor: 100_000, kind: "PERCENT_CHANGE", percentBasisPoints: -1000 })).toEqual({
      scenarioAmountMinor: 90_000,
      rejectedReason: null,
    });
    expect(applyScenarioAssumptionV1({ baselineAmountMinor: 100_000, kind: "DELTA_AMOUNT", amountMinorDelta: 20_000 })).toEqual({
      scenarioAmountMinor: 120_000,
      rejectedReason: null,
    });
    expect(applyScenarioAssumptionV1({ baselineAmountMinor: null, kind: "ABSOLUTE_AMOUNT", absoluteAmountMinor: 50_000 })).toEqual({
      scenarioAmountMinor: 50_000,
      rejectedReason: null,
    });
    expect(applyScenarioAssumptionV1({ baselineAmountMinor: 40_000, kind: "EXCLUDE_ACCOUNT" })).toEqual({
      scenarioAmountMinor: 0,
      rejectedReason: null,
    });
    expect(
      applyScenarioAssumptionV1({ baselineAmountMinor: null, kind: "PERCENT_CHANGE", percentBasisPoints: -500 }).rejectedReason,
    ).toBe("PERCENT_REQUIRES_BASELINE");
  });

  it("forbids LLM as numerical engine", () => {
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.numericalScenarioNotLlm).toBe(true);
    expect(SCENARIO_AI_BOUNDARY.llmNotCalculator).toBe(true);
  });
});

describe("FIN-04D comparison, permissions, navigation", () => {
  it("uses frozen baseline as primary comparison and presentation-layer favorability", () => {
    expect(SCENARIO_COMPARISON_HIERARCHY.primary).toContain("FROZEN_BASELINE");
    expect(SCENARIO_COMPARISON_HIERARCHY.deltaFormula).toBe("comparison − base");
    expect(SCENARIO_COMPARISON_HIERARCHY.favorabilityPresentationLayerOnly).toBe(true);
  });

  it("reuses forecast permissions and Prognose workspace route", () => {
    expect(SCENARIO_PERMISSION_CONTRACT.view).toBe("finance.forecast.view");
    expect(SCENARIO_PERMISSION_CONTRACT.createEditDuplicateArchiveDelete).toBe(
      "finance.forecast.manage",
    );
    expect(SCENARIO_NAVIGATION_CONTRACT.workspaceRoute).toBe("/dashboard/finance/forecast");
    expect(SCENARIO_NAVIGATION_CONTRACT.noSeparateTopLevelFinanceTab).toBe(true);
  });

  it("uses lightweight versioning", () => {
    expect(SCENARIO_VERSIONING_DECISION).toBe("LIGHTWEIGHT");
  });
});

describe("FIN-04D tenant neutrality and boundaries", () => {
  it("remains tenant-configurable and phasing-free", () => {
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.financeYearTenantDefined).toBe(
      FINANCIAL_YEAR_CONFIGURABLE,
    );
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing).toBe(
      FORECAST_PHASING_SUPPORTED === false,
    );
    expect(SCE_SCENARIO_ARCHITECTURE_LOCKS.noTimedCashInV1).toBe(true);
  });

  it("documents binary control compliance for future UX", () => {
    expect(SCENARIO_UX_ARCHITECTURE.binaryControlCompliance.newBinaryCheckboxes).toBe(0);
  });
});

describe("FIN-04D persistence proposal — not implemented in 04D-01", () => {
  it("does not migrate in 04D-01 and uses dedicated scenario models", () => {
    expect(SCENARIO_PERSISTENCE_PROPOSAL.migrationInFin04d01).toBe(false);
    expect(SCENARIO_PERSISTENCE_PROPOSAL.models.FinanceScenario).toBeDefined();
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).not.toContain("model FinanceScenario");
    expect(
      SCE_SCENARIO_ARCHITECTURE_LOCKS.financeForecastVersionScenarioKeyNotCanonicalScenarioStore,
    ).toBe(true);
  });
});

describe("FIN-04D architecture documentation present", () => {
  it("includes canonical FIN-04D architecture document", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md"),
      "utf8",
    );
    expect(doc).toContain("FIN-04D");
    expect(doc).toContain("hypothetical");
    expect(doc).toContain("REFERENCE_PLUS_FROZEN_BASELINE_LINES");
    expect(doc).toContain("LIGHTWEIGHT");
  });
});
