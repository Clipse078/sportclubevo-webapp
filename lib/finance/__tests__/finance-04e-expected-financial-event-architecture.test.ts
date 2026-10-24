import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import {
  EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS,
  EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS,
  EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME,
  EXPECTED_FINANCIAL_EVENT_CURRENT_FORECAST_RELATIONSHIP,
  EXPECTED_FINANCIAL_EVENT_DATE_SEMANTICS,
  EXPECTED_FINANCIAL_EVENT_LIQUIDITY_BOUNDARY,
  EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL,
  EXPECTED_FINANCIAL_EVENT_RECONCILIATION,
  EXPECTED_FINANCIAL_EVENT_SCENARIO_BOUNDARY,
  EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS,
  EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION,
  EXPECTED_FINANCIAL_EVENT_UX_ARCHITECTURE,
  FINANCE_TEMPORAL_LOCKED_PRINCIPLE,
} from "@/lib/finance/forecast/expected-financial-event-architecture-contract";
import {
  SCENARIO_ASSUMPTION_V1_FORBIDDEN_TEMPORAL_FIELDS,
  SCENARIO_TIMED_CASH_BOUNDARY,
} from "@/lib/finance/forecast/scenario-architecture-contract";

describe("FIN-04E architecture contract locks", () => {
  it("locks temporal intelligence boundaries (04E-01) and 04E-02 persistence locks", () => {
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.expectedEventIsNotActual).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.expectedEventIsNotForecastVersion).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.expectedDateIsNotRecognitionDate).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.annualExpectationSeparateFromTiming).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.unscheduledRemainderAllowed).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.liquidityDeferredToFin09).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.persistenceNotImplementedIn04e01).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.persistenceImplementedIn04e02).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL.migrationInFin04e01).toBe(false);
    expect(EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL.notInPrismaSchemaYet).toBe(false);
    expect(EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS.UNSCHEDULED_REMAINDER_IS_DERIVED).toBe(
      true,
    );
    expect(
      EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS.NO_SYNTHETIC_BALANCING_EVENT,
    ).toBe(true);
  });

  it("forbids naive phasing and fake monthly distribution", () => {
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing).toBe(
      FORECAST_PHASING_SUPPORTED === false,
    );
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.noNaiveMonthProration).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_RECONCILIATION.fakeEvenMonthlyDistributionForbidden).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_RECONCILIATION.naiveDivideByTwelveForbidden).toContain("/ 12");
  });

  it("remains tenant-configurable and neutral", () => {
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.tenantScoped).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.countryAgnostic).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.sportAgnostic).toBe(true);
    expect(FINANCIAL_YEAR_CONFIGURABLE).toBe(true);
  });

  it("uses business-date timing semantics", () => {
    expect(EXPECTED_FINANCIAL_EVENT_DATE_SEMANTICS.primary).toBe("BUSINESS_DATE_ONLY");
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.dateOnlyBusinessTiming).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_DATE_SEMANTICS.timezoneMustNotShiftBusinessDate).toBe(true);
  });

  it("derives direction from FinancialAccount — no independent event direction", () => {
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.directionDerivedFromFinancialAccount).toBe(
      true,
    );
    expect(
      EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.independentEditableEventDirectionForbidden,
    ).toBe(true);
  });
});

describe("FIN-04E canonical naming", () => {
  it("chooses Expected Financial Event over cash transaction wording", () => {
    expect(EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME).toBe("FinanceExpectedFinancialEvent");
    expect(FINANCE_TEMPORAL_LOCKED_PRINCIPLE).toContain("EXPECTED_FINANCIAL_TIMING");
  });

  it("documents v1 timing precision without coercing approximate dates", () => {
    expect(EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION).toEqual([
      "EXACT_DATE",
      "DATE_RANGE",
      "MONTH",
      "UNSCHEDULED",
    ]);
  });

  it("supports manual source in v1", () => {
    expect(EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS.v1Required).toEqual(["MANUAL"]);
    expect(EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS.sourceAgnosticCore).toBe(true);
  });
});

describe("FIN-04E reconciliation and forecast relationship", () => {
  it("allows unscheduled remainder and detects over-allocation", () => {
    expect(EXPECTED_FINANCIAL_EVENT_RECONCILIATION.states).toEqual([
      "BALANCED",
      "UNSCHEDULED_REMAINDER",
      "OVERALLOCATED",
    ]);
    expect(EXPECTED_FINANCIAL_EVENT_RECONCILIATION.exampleValid.unscheduled).toBe(30_000);
  });

  it("keeps current forecast as annual authority", () => {
    expect(EXPECTED_FINANCIAL_EVENT_CURRENT_FORECAST_RELATIONSHIP.expectedEventsAreTimingEvidence).toBe(
      true,
    );
    expect(
      EXPECTED_FINANCIAL_EVENT_CURRENT_FORECAST_RELATIONSHIP.silentRedefineForecastAsSumOfEventsForbidden,
    ).toBe(true);
    expect(
      EXPECTED_FINANCIAL_EVENT_CURRENT_FORECAST_RELATIONSHIP.timingOnlyEditDoesNotRequireForecastRevision,
    ).toBe(true);
  });
});

describe("FIN-04E boundaries — FIN-04D, FIN-09, FIN-11", () => {
  it("does not change FIN-04D annual scenario semantics", () => {
    expect(EXPECTED_FINANCIAL_EVENT_SCENARIO_BOUNDARY.fin04dAnnualSemanticsUnchanged).toBe(true);
    expect(SCENARIO_TIMED_CASH_BOUNDARY.timingCapabilityImplemented).toBe(false);
    expect(EXPECTED_FINANCIAL_EVENT_SCENARIO_BOUNDARY.effectiveDateOnFinanceScenarioAssumptionForbiddenUntil04e06).toBe(
      true,
    );
  });

  it("does not add effective-date fields to FinanceScenarioAssumption schema", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    const assumptionBlock = schema.slice(
      schema.indexOf("model FinanceScenarioAssumption"),
      schema.indexOf("enum FinanceProjectionDataSufficiency"),
    );
    for (const field of SCENARIO_ASSUMPTION_V1_FORBIDDEN_TEMPORAL_FIELDS) {
      expect(assumptionBlock).not.toContain(field);
    }
  });

  it("defers liquidity to FIN-09", () => {
    expect(EXPECTED_FINANCIAL_EVENT_LIQUIDITY_BOUNDARY.liquidityNotImplementedIn04e).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.liquidityDeferredToFin09).toBe(true);
  });

  it("persists FinanceExpectedFinancialEvent without legacy cash placeholder model", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model FinanceExpectedFinancialEvent");
    expect(schema).not.toContain("model FinanceExpectedCashEvent");
    expect(schema).not.toContain("model FinanceUnscheduledRemainder");
  });
});

describe("FIN-04E architecture documentation present", () => {
  it("includes canonical FIN-04E architecture document", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md"),
      "utf8",
    );
    expect(doc).toContain("FIN-04E");
    expect(doc).toContain("FinanceExpectedFinancialEvent");
    expect(doc).toContain("UNSCHEDULED REMAINDER");
    expect(doc).toContain("ANNUAL EXPECTATION");
  });

  it("updates forecast timing direction doc without losing locked principles", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md"),
      "utf8",
    );
    expect(doc).toContain("ANNUAL EXPECTATION");
    expect(doc).toContain("no naive month proration");
    expect(doc).toContain("SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md");
  });
});

describe("FIN-04E UX binary control documentation", () => {
  it("documents zero new binary checkboxes for future UX", () => {
    expect(EXPECTED_FINANCIAL_EVENT_UX_ARCHITECTURE.noNewBinaryCheckboxPatterns).toBe(true);
  });
});

describe("FIN-04E contract has no country-specific hardcoding", () => {
  it("avoids CHF/SFV/J+S in canonical contract source", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "lib/finance/forecast/expected-financial-event-architecture-contract.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/\bCHF\b/);
    expect(source).not.toContain("SFV");
    expect(source).not.toContain("J+S");
  });
});
