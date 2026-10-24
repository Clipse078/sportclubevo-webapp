import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FINANCIAL_YEAR_CONFIGURABLE, FINANCE_MONEY_MODEL } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import {
  PROJECTION_CALCULATION_GRAIN,
  PROJECTION_CAPABILITY_KEY,
  PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE,
  PROJECTION_METHODOLOGY_FAMILIES,
  PROJECTION_DOMAIN_SEPARATION_GUARDS,
  PROJECTION_GERMAN_PRODUCT_TERMS,
  PROJECTION_PERMISSION_CONTRACT,
  PROJECTION_PUBLISHED_GRAIN,
  PROJECTION_TO_FORECAST_APPLY_SCOPE,
  SCE_MEASURE_ACTUAL,
  SCE_MEASURE_APPROVED_BUDGET,
  SCE_MEASURE_CURRENT_FORECAST,
  SCE_MEASURE_SCENARIO,
  SCE_MEASURE_SCE_PROJECTION,
  SCE_PROJECTION_ARCHITECTURE_LOCKS,
} from "@/lib/finance/projection/projection-architecture-contract";

describe("FIN-04B projection vs forecast vs scenario semantics", () => {
  it("keeps projection, current forecast, scenario, budget, and actual distinct", () => {
    const measures = [
      SCE_MEASURE_SCE_PROJECTION,
      SCE_MEASURE_CURRENT_FORECAST,
      SCE_MEASURE_SCENARIO,
      SCE_MEASURE_APPROVED_BUDGET,
      SCE_MEASURE_ACTUAL,
    ];
    expect(new Set(measures).size).toBe(measures.length);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.projectionDistinctFromCurrentForecast).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.projectionDistinctFromScenario).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.useForecastScenarioKeyForProjection).toBe(false);
  });

  it("forbids silent overwrite of forecast or budget and independent actuals", () => {
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.projectionNeverSilentlyOverwritesForecast).toBe(
      true,
    );
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.forecastNeverSilentlyOverwritesApprovedBudget).toBe(
      true,
    );
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.actualRemainsIndependentFromForecastAndProjection).toBe(
      true,
    );
    expect(PROJECTION_TO_FORECAST_APPLY_SCOPE.requiresExplicitUserAction).toBe(true);
    expect(PROJECTION_TO_FORECAST_APPLY_SCOPE.mutatesApprovedBudget).toBe(false);
    expect(PROJECTION_TO_FORECAST_APPLY_SCOPE.mutatesActuals).toBe(false);
    expect(PROJECTION_TO_FORECAST_APPLY_SCOPE.mutatesProjectionSnapshot).toBe(false);
    expect(PROJECTION_TO_FORECAST_APPLY_SCOPE.createsNewForecastVersion).toBe(true);
  });
});

describe("FIN-04B numerical engine and data honesty", () => {
  it("uses deterministic/statistical engine — not LLM as calculator", () => {
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.numericalEngineNotLlm).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.llmMayAssistExplanationOnly).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.naiveYtdAnnualisationIsNotDefaultIntelligence).toBe(
      true,
    );
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.fabricatePrecisionWhenInsufficientData).toBe(false);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.fakeProjectionRangesWhenUnavailable).toBe(false);
  });

  it("does not import LLM providers in projection contract module", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/projection/projection-architecture-contract.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/\bopenai\b/i);
    expect(source).not.toMatch(/\banthropic\b/i);
    expect(source).not.toMatch(/\b@ai-sdk\b/);
    expect(source).not.toMatch(/\bllm\b/i);
  });
});

describe("FIN-04B tenant, currency, and FinanceYear semantics", () => {
  it("respects tenant-defined finance years and configurable currency", () => {
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.financeYearTenantDefined).toBe(
      FINANCIAL_YEAR_CONFIGURABLE,
    );
    expect(PROJECTION_CALCULATION_GRAIN.mustRespectTenantFinanceYearBoundaries).toBe(true);
    expect(PROJECTION_CALCULATION_GRAIN.assumesCalendarJanuaryDecember).toBe(false);
    expect(PROJECTION_CALCULATION_GRAIN.assumesTwelveCalendarMonths).toBe(false);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.noHardcodedCurrency).toBe(true);
    expect(FINANCE_MONEY_MODEL.hardcodedCurrency).toBe(false);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.crossTenantEvidenceForbidden).toBe(true);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.tenantEvidenceTenantIsolated).toBe(true);
  });

  it("baseline evidence does not require FIN-07/FIN-08 modules", () => {
    expect(PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE).not.toContain("KNOWN_COMMITMENTS");
    expect(PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE).not.toContain("RECEIVABLES");
    expect(PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE).toContain("HISTORICAL_ACTUALS");
    expect(PROJECTION_EVIDENCE_AVAILABLE_FIN_04B_BASELINE).toContain("CURRENT_YEAR_ACTUALS");
  });
});

describe("FIN-04B projection grain and phasing", () => {
  it("aligns published grain with FIN-04A annual account grain", () => {
    expect(PROJECTION_PUBLISHED_GRAIN.annualAmountMinor).toBe(true);
    expect(PROJECTION_PUBLISHED_GRAIN.monthlyForecastValuesInPublishedProjection).toBe(false);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.publishedProjectionPhasingSupported).toBe(
      FORECAST_PHASING_SUPPORTED,
    );
    expect(FORECAST_PHASING_SUPPORTED).toBe(false);
  });
});

describe("FIN-04B capability and permissions", () => {
  it("remains under FORECASTING capability with forecast permissions", () => {
    expect(PROJECTION_CAPABILITY_KEY).toBe("FORECASTING");
    expect(PROJECTION_PERMISSION_CONTRACT.view).toBe("finance.forecast.view");
    expect(PROJECTION_PERMISSION_CONTRACT.applyToCurrentForecast).toBe(
      "finance.forecast.manage",
    );
  });
});

describe("FIN-04B German product terminology", () => {
  it("uses Automatische Prognose distinct from Aktuelle Prognose inside Prognose workspace", () => {
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.automaticForecast).toBe("Automatische Prognose");
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.currentForecast).toBe("Aktuelle Prognose");
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.workspaceTab).toBe("Prognose");
  });
});

describe("FIN-04A schema integrity (regression guard)", () => {
  it("keeps FIN-04A forecast models alongside FIN-04B projection persistence", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model FinanceForecast");
    expect(schema).toContain("model FinanceForecastVersion");
    expect(schema).toContain("model FinanceForecastLine");
    expect(schema).toContain("model FinanceProjection");
    expect(schema).toContain("model FinanceProjectionVersion");
    expect(schema).toContain("model FinanceProjectionLine");
    expect(schema).toContain("currentProjectionVersionId");
    expect(schema).not.toMatch(/model SceProjection\b/);
    const lineBlock = schema.match(/model FinanceProjectionLine \{[\s\S]*?\n\}/)?.[0];
    expect(lineBlock).toContain("methodologyFamily");
    expect(PROJECTION_METHODOLOGY_FAMILIES).toContain("MIXED");
  });

  it("documents scenarioKey as FIN-04D hook — projection must not reuse it", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/scenarioKey/);
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.useForecastScenarioKeyForProjection).toBe(false);
  });
});

describe("FIN-04B-07 domain separation release guards", () => {
  it("locks automatic forecast vs current forecast vs budget vs actual invariants", () => {
    for (const value of Object.values(PROJECTION_DOMAIN_SEPARATION_GUARDS)) {
      expect(value).toBe(true);
    }
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.inferCurrentVersionByMaxVersionNumberForbidden).toBe(
      true,
    );
    expect(SCE_PROJECTION_ARCHITECTURE_LOCKS.noUserSelectableForecastAlgorithm).toBe(true);
  });

  it("resolves canonical forecast version via pointer helper (not relation ordering)", () => {
    const forecastService = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-forecast-service.ts"),
      "utf8",
    );
    expect(forecastService).toContain("resolveCanonicalCurrentForecastVersionByPointer");
    expect(forecastService).toMatch(/FinanceForecast\.currentVersionId/);
    const queryService = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-forecast-query-service.ts"),
      "utf8",
    );
    expect(queryService).toContain("resolveCanonicalCurrentForecastVersionByPointer");
    const projectionService = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-projection-service.ts"),
      "utf8",
    );
    expect(projectionService).toContain("currentProjectionVersionId");
    expect(projectionService).toContain("currentProjectionVersion");
  });
});

describe("FIN-04B architecture documentation present", () => {
  it("includes canonical FIN-04B architecture document", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md"),
      "utf8",
    );
    expect(doc).toContain("SCE generates the projection");
    expect(doc).toContain("VERSIONED_SNAPSHOT_HYBRID");
    expect(doc).toMatch(/Automatische Prognose|tenant-facing.*projection/i);
    const methodology = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-04B-04-METHODOLOGY.md"),
      "utf8",
    );
    expect(methodology).toContain("sce-projection-v1");
  });
});
