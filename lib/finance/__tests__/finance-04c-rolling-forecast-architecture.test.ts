import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import { computeForecastRevisionComparisonMetrics } from "@/lib/finance/forecast/forecast-revision-comparison";
import {
  FIN_04B_ADOPTION_REVISION_SOURCE,
  FORECAST_AS_OF_DATE_SEMANTICS,
  FORECAST_REVISION_SOURCES,
  FORECAST_VERSION_STATE_MACHINE,
  ROLLING_FORECAST_CONCURRENCY_CONTRACT,
  ROLLING_FORECAST_DATA_MODEL_EVOLUTION,
  ROLLING_FORECAST_FIN_04C_02_PERSISTENCE,
  ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST,
  ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON,
  ROLLING_FORECAST_FIN_04C_05_WORKSPACE_UX,
  ROLLING_FORECAST_GERMAN_PRODUCT_TERMS,
  ROLLING_FORECAST_LEGACY_COMPATIBILITY,
  ROLLING_FORECAST_MEASURE_GUARDS,
  ROLLING_FORECAST_PERMISSION_CONTRACT,
  ROLLING_FORECAST_PRODUCT_PRINCIPLE,
  ROLLING_FORECAST_SCENARIO_BOUNDARY,
  ROLLING_FORECAST_WORKING_VS_FORMAL_DECISION,
  SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS,
} from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  PROJECTION_GERMAN_PRODUCT_TERMS,
  SCE_MEASURE_CURRENT_FORECAST,
  SCE_MEASURE_SCENARIO,
  SCE_MEASURE_SCE_PROJECTION,
} from "@/lib/finance/projection/projection-architecture-contract";

describe("FIN-04C reforecast vs scenario and automatic forecast boundaries", () => {
  it("keeps reforecast, scenario, and automatic forecast distinct", () => {
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.reforecastDistinctFromScenario).toBe(
      true,
    );
    expect(ROLLING_FORECAST_SCENARIO_BOUNDARY.ordinaryRevisionMustNotUseScenarioKey).toBe(
      true,
    );
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.automaticForecastIndependentFromCurrentForecast).toBe(
      true,
    );
    expect(ROLLING_FORECAST_MEASURE_GUARDS.reforecastMapsTo).toBe(SCE_MEASURE_CURRENT_FORECAST);
    expect(ROLLING_FORECAST_MEASURE_GUARDS.scenarioMapsTo).toBe(SCE_MEASURE_SCENARIO);
    expect(new Set(ROLLING_FORECAST_MEASURE_GUARDS.measures).size).toBe(
      ROLLING_FORECAST_MEASURE_GUARDS.measures.length,
    );
  });

  it("forbids using scenarioKey for ordinary rolling forecast revisions", () => {
    expect(ROLLING_FORECAST_DATA_MODEL_EVOLUTION.FinanceForecastVersion.scenarioKey).toBe(
      "KEEP_FOR_FIN_04D_ONLY",
    );
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.scenarioKeyNotForOrdinaryRevisions).toBe(
      true,
    );
  });
});

describe("FIN-04C working current vs formal revision", () => {
  it("does not create a formal version on every manual edit", () => {
    expect(
      SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.manualLineEditDoesNotCreateFormalVersion,
    ).toBe(true);
    expect(ROLLING_FORECAST_WORKING_VS_FORMAL_DECISION.manualLineEditCreatesFormalVersion).toBe(
      false,
    );
    expect(
      ROLLING_FORECAST_WORKING_VS_FORMAL_DECISION.explicitFormalReforecastCreatesFormalVersion,
    ).toBe(true);
  });

  it("treats FIN-04B adoption as a meaningful formal revision source", () => {
    expect(FIN_04B_ADOPTION_REVISION_SOURCE).toBe("AUTOMATIC_FORECAST_ADOPTION");
    expect(FORECAST_REVISION_SOURCES).toContain("AUTOMATIC_FORECAST_ADOPTION");
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.fin04bAdoptionRemainsMeaningfulFormalRevision).toBe(
      true,
    );
  });

  it("locks the living current forecast product principle", () => {
    expect(ROLLING_FORECAST_PRODUCT_PRINCIPLE).toContain("LIVING MANAGEMENT VIEW");
    expect(ROLLING_FORECAST_PRODUCT_PRINCIPLE).toContain("GOVERNANCE HISTORY");
  });
});

describe("FIN-04C canonical current pointer and immutability", () => {
  it("uses FinanceForecast.currentVersionId as canonical current", () => {
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.currentForecastVersionFromContainerPointer).toBe(
      true,
    );
    expect(FORECAST_VERSION_STATE_MACHINE.inferCurrentByMaxVersionNumberForbidden).toBe(true);
    expect(FORECAST_VERSION_STATE_MACHINE.supersededMutationForbidden).toBe(true);
    expect(
      SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.historicalFormalRevisionsOrdinarilyUndeletable,
    ).toBe(true);
  });

  it("requires stable IDs for FIN-05/06 snapshot references", () => {
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.fin05Fin06StableSnapshotReferencesRequired).toBe(
      true,
    );
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.forecastHistoryUsesStableVersionIds).toBe(
      true,
    );
  });
});

describe("FIN-04C tenant finance year and cadence", () => {
  it("respects tenant-defined finance years without fixed reforecast cadence", () => {
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.financeYearTenantDefined).toBe(
      FINANCIAL_YEAR_CONFIGURABLE,
    );
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.noFixedReforecastCadence).toBe(true);
    expect(FORECAST_AS_OF_DATE_SEMANTICS.mustRespectTenantFinanceYearBoundaries).toBe(true);
  });
});

describe("FIN-04C cutoff / as-of semantics", () => {
  it("keeps Datenstand distinct from createdAt", () => {
    expect(FORECAST_AS_OF_DATE_SEMANTICS.asOfDateDistinctFromCreatedAt).toBe(true);
    expect(FORECAST_AS_OF_DATE_SEMANTICS.monthEndNotRequired).toBe(true);
  });
});

describe("FIN-04C automatic forecast relationship", () => {
  it("does not tie automatic forecast staleness to current forecast edits", () => {
    expect(
      SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.currentForecastChangeNeverMarksAutomaticForecastStale,
    ).toBe(true);
    expect(
      SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.automaticForecastRefreshNeverCreatesCurrentForecastRevision,
    ).toBe(true);
  });

  it("preserves distinct German labels for refresh vs formal reforecast", () => {
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.applyAction).toBe(
      "Automatische Prognose übernehmen",
    );
    expect(ROLLING_FORECAST_GERMAN_PRODUCT_TERMS.formalReforecastAction).toBe(
      "Neue Prognose festhalten",
    );
    expect(ROLLING_FORECAST_GERMAN_PRODUCT_TERMS.formalReforecastAction).not.toBe(
      PROJECTION_GERMAN_PRODUCT_TERMS.automaticForecast,
    );
  });
});

describe("FIN-04C comparison semantics", () => {
  it("computes neutral revision delta as new minus previous", () => {
    expect(
      computeForecastRevisionComparisonMetrics({
        previousForecastMinor: 160_000_00,
        newForecastMinor: 170_000_00,
      }).rawRevisionDeltaMinor,
    ).toBe(10_000_00);
    expect(
      computeForecastRevisionComparisonMetrics({
        previousForecastMinor: 80_000_00,
        newForecastMinor: 90_000_00,
      }).rawRevisionDeltaMinor,
    ).toBe(10_000_00);
  });
});

describe("FIN-04C numerical engine and phasing guards", () => {
  it("does not use LLM for numerical forecasting in contract module", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/forecast/rolling-forecast-architecture-contract.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/\bopenai\b/i);
    expect(source).not.toMatch(/\banthropic\b/i);
    expect(source).not.toMatch(/\b@ai-sdk\b/);
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.numericalForecastNotLlm).toBe(true);
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.noFakeForecastPhasing).toBe(
      FORECAST_PHASING_SUPPORTED === false,
    );
  });
});

describe("FIN-04C-03 formal reforecast service facts", () => {
  it("records tenant-facing formalization from FIN-04C-03", () => {
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.tenantFacingAction).toBe(
      "Neue Prognose festhalten",
    );
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.noAutomaticForecastSideEffects).toBe(true);
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.mutableCurrentUntilNextFormalRevision).toBe(
      true,
    );
  });
});

describe("FIN-04C-02 implemented persistence facts", () => {
  it("records durable persistence primitives from FIN-04C-02", () => {
    expect(ROLLING_FORECAST_FIN_04C_02_PERSISTENCE.formalRevisionPrimitive).toBe(
      "persistFormalForecastRevision",
    );
    expect(ROLLING_FORECAST_FIN_04C_02_PERSISTENCE.legacyRevisionMetadataNullable).toBe(true);
    expect(ROLLING_FORECAST_FIN_04C_02_PERSISTENCE.sourceProjectionVersionIdDistinctFromAdoption).toBe(
      true,
    );
  });
});

describe("FIN-04C-04 history & comparison query locks", () => {
  it("documents FIN-04C-05 workspace UX locks", () => {
    expect(ROLLING_FORECAST_FIN_04C_05_WORKSPACE_UX.formalReforecastDialog).toBe(
      "Neue Prognose festhalten",
    );
    expect(ROLLING_FORECAST_FIN_04C_05_WORKSPACE_UX.noBinaryCheckboxConfirmation).toBe(true);
  });

  it("documents Prognoseverlauf query boundaries", () => {
    expect(ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON.prognoseverlaufCanonicalManagementRevisionsOnly).toBe(
      true,
    );
    expect(ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON.scenarioKeyExcludedFromHistory).toBe(
      true,
    );
    expect(ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON.viewPermissionOnly).toBe(
      "finance.forecast.view",
    );
  });
});

describe("FIN-04C permissions and legacy models", () => {
  it("reuses finance.forecast view/manage permissions", () => {
    expect(ROLLING_FORECAST_PERMISSION_CONTRACT.viewCurrentHistoryAndComparisons).toBe(
      "finance.forecast.view",
    );
    expect(ROLLING_FORECAST_PERMISSION_CONTRACT.editCurrentAndCreateFormalReforecast).toBe(
      "finance.forecast.manage",
    );
  });

  it("keeps FIN-04A/B models recognized with safe legacy semantics", () => {
    expect(SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.fin04aFin04bModelsRemainValid).toBe(true);
    expect(ROLLING_FORECAST_LEGACY_COMPATIBILITY.doNotInventFalseHistoricalCutoffOrLabels).toBe(
      true,
    );
    expect(ROLLING_FORECAST_DATA_MODEL_EVOLUTION.FinanceForecast.action).toBe("KEEP");
    expect(ROLLING_FORECAST_DATA_MODEL_EVOLUTION.FinanceForecastLine.action).toBe("KEEP");
  });
});

describe("FIN-04C concurrency contract", () => {
  it("requires expected current version id for formal reforecast", () => {
    expect(ROLLING_FORECAST_CONCURRENCY_CONTRACT.formalReforecastRequiresExpectedCurrentVersionId).toBe(
      true,
    );
    expect(ROLLING_FORECAST_CONCURRENCY_CONTRACT.staleEditorMustRefreshNotSilentlyOverwrite).toBe(
      true,
    );
  });
});

describe("FIN-04C measure guard — projection remains separate", () => {
  it("does not conflate SCE projection with current forecast measure", () => {
    expect(SCE_MEASURE_SCE_PROJECTION).not.toBe(SCE_MEASURE_CURRENT_FORECAST);
    expect(
      SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS.automaticForecastNeverSilentlyOverwritesCurrentForecast,
    ).toBe(true);
  });
});
