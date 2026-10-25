import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyExpectedEventEffectiveDateApplicability } from "@/lib/finance/forecast/classify-expected-event-effective-date-applicability";
import { calculateEffectiveDatedScenarioAssumption } from "@/lib/finance/forecast/calculate-effective-dated-scenario-assumption";
import { calculateFinanceScenario } from "@/lib/finance/forecast/calculate-finance-scenario";
import { calculateFinanceScenarioWithTemporalSupport } from "@/lib/finance/forecast/merge-effective-dated-scenario-calculation";
import {
  EFFECTIVE_DATED_ASSUMPTION_SUPPORT,
  EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS,
} from "@/lib/finance/forecast/effective-dated-scenario-architecture-contract";
import { validateScenarioAssumptionPayload } from "@/lib/finance/forecast/scenario-assumption-persistence-validation";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";

const cutoff = "2027-05-31";

function eventExact(iso: string, amount: number): ExpectedFinancialEventForReconciliation {
  return {
    expectedAmountMinor: amount,
    timingPrecision: "EXACT_DATE",
    expectedDateIso: iso,
  };
}

function baseTemporalInput(events: ExpectedFinancialEventForReconciliation[]) {
  return {
    kind: "PERCENT_CHANGE" as const,
    percentBasisPoints: -1000,
    effectiveFromDateIso: "2027-07-01",
    baselineAmountMinor: 100_000,
    actualsThroughDateIso: cutoff,
    actualThroughCutoffMinor: 40_000,
    expectedEvents: events,
  };
}

describe("FIN-04E-06 effective-date classification", () => {
  it("EXACT_DATE: before effective remains unaffected", () => {
    expect(
      classifyExpectedEventEffectiveDateApplicability(
        "2027-07-01",
        eventExact("2027-06-30", 30_000),
      ),
    ).toBe("BEFORE_EFFECTIVE_DATE");
  });

  it("EXACT_DATE: on effective date is affected", () => {
    expect(
      classifyExpectedEventEffectiveDateApplicability(
        "2027-07-01",
        eventExact("2027-07-01", 10_000),
      ),
    ).toBe("AFTER_EFFECTIVE_DATE");
  });

  it("MONTH August after mid-July effective is affected", () => {
    expect(
      classifyExpectedEventEffectiveDateApplicability("2027-07-15", {
        expectedAmountMinor: 10_000,
        timingPrecision: "MONTH",
        expectedMonthStartIso: "2027-08-01",
      }),
    ).toBe("AFTER_EFFECTIVE_DATE");
  });

  it("MONTH July with mid-July effective is ambiguous", () => {
    expect(
      classifyExpectedEventEffectiveDateApplicability("2027-07-15", {
        expectedAmountMinor: 10_000,
        timingPrecision: "MONTH",
        expectedMonthStartIso: "2027-07-01",
      }),
    ).toBe("AMBIGUOUS_AT_EFFECTIVE_DATE");
  });

  it("DATE_RANGE overlapping effective is ambiguous without proration", () => {
    expect(
      classifyExpectedEventEffectiveDateApplicability("2027-07-01", {
        expectedAmountMinor: 10_000,
        timingPrecision: "DATE_RANGE",
        rangeStartDateIso: "2027-06-20",
        rangeEndDateIso: "2027-07-10",
      }),
    ).toBe("AMBIGUOUS_AT_EFFECTIVE_DATE");
  });
});

describe("FIN-04E-06 temporal scenario calculation", () => {
  it("PERCENT effective 01.07 leaves 30.06 untouched and impacts 30.09 by -3'000", () => {
    const result = calculateEffectiveDatedScenarioAssumption(
      baseTemporalInput([
        eventExact("2027-06-30", 30_000),
        eventExact("2027-09-30", 30_000),
      ]),
    );
    expect(result.eligibleTimedBaseAmountMinor).toBe(30_000);
    expect(result.knownScenarioImpactMinor).toBe(-3_000);
    expect(result.temporalCoverageState).toBe("COMPLETE");
    expect(result.annualScenarioAmountMinor).toBe(97_000);
  });

  it("PARTIAL coverage exposes unscheduled remainder without fabricated total", () => {
    const result = calculateEffectiveDatedScenarioAssumption({
      ...baseTemporalInput([eventExact("2027-09-30", 30_000)]),
      baselineAmountMinor: 90_000,
      actualThroughCutoffMinor: 40_000,
    });
    expect(result.unscheduledBaseAmountMinor).toBe(20_000);
    expect(result.knownScenarioImpactMinor).toBe(-3_000);
    expect(result.temporalCoverageState).toBe("PARTIAL");
    expect(result.annualScenarioAmountMinor).toBe(90_000);
    expect(result.adoptionEligible).toBe(false);
  });

  it("COMPLETE when remaining future is fully timed and classifiable", () => {
    const result = calculateEffectiveDatedScenarioAssumption(
      baseTemporalInput([
        eventExact("2027-06-30", 30_000),
        eventExact("2027-09-30", 30_000),
      ]),
    );
    expect(result.temporalCoverageState).toBe("COMPLETE");
    expect(result.adoptionEligible).toBe(true);
  });
});

describe("FIN-04E-06 legacy FIN-04D compatibility", () => {
  it("null effective date preserves identical annual calculation", () => {
    const input = {
      scenarioId: "s1",
      tenantId: "t1",
      financeYearId: "fy1",
      baselineLines: [{ financialAccountId: "a1", amountMinor: 100_000 }],
      assumptions: [
        {
          financialAccountId: "a1",
          kind: "PERCENT_CHANGE" as const,
          percentBasisPoints: -1000,
          effectiveFromDateIso: null,
        },
      ],
      accountSemantics: [{ financialAccountId: "a1", canonicalSemantic: "INCOME" as const }],
    };
    const before = calculateFinanceScenario(input);
    const after = calculateFinanceScenarioWithTemporalSupport({
      calculationInput: input,
      temporalEvidenceByAccountId: new Map(),
      scenarioUpdatedAtIso: "2027-01-01T00:00:00.000Z",
    });
    expect(after.totals).toEqual(before.totals);
    expect(after.accountResults).toEqual(before.accountResults);
  });
});

describe("FIN-04E-06 UX binary control compliance", () => {
  it("uses segmented control for effective-date scope (no new checkboxes)", () => {
    const dialog = readFileSync(
      resolve(
        process.cwd(),
        "components/admin/finance/scenario/FinanceScenarioAssumptionDialog.tsx",
      ),
      "utf8",
    );
    expect(dialog).toContain("SceSegmentedControl");
    expect(dialog).toContain("FULL_FORECAST");
    expect(dialog).not.toMatch(/type="checkbox"/);
  });
});

describe("FIN-04E-06 support matrix & validation", () => {
  it("documents assumption kind support", () => {
    expect(EFFECTIVE_DATED_ASSUMPTION_SUPPORT.PERCENT_CHANGE).toBe("SUPPORTED");
    expect(EFFECTIVE_DATED_ASSUMPTION_SUPPORT.EXCLUDE_ACCOUNT).toBe("SUPPORTED");
    expect(EFFECTIVE_DATED_ASSUMPTION_SUPPORT.DELTA_AMOUNT).toBe("NOT_SUPPORTED");
    expect(EFFECTIVE_DATED_ASSUMPTION_SUPPORT.ABSOLUTE_AMOUNT).toBe("NOT_SUPPORTED");
  });

  it("rejects unsupported effective-date combinations at validation boundary", () => {
    expect(() =>
      validateScenarioAssumptionPayload({
        kind: "DELTA_AMOUNT",
        amountMinorDelta: 1000,
        effectiveFromDateIso: "2027-07-01",
      }),
    ).toThrow("FINANCE_SCENARIO_EFFECTIVE_DATE_UNSUPPORTED_ASSUMPTION");
  });

  it("locks architecture principles", () => {
    expect(EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS.nullEffectiveDatePreserves04dSemantics).toBe(
      true,
    );
    expect(EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS.unscheduledRemainderIsNotProrated).toBe(
      true,
    );
    expect(EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS.partialTemporalCoverageDoesNotFabricateTotal).toBe(
      true,
    );
  });
});

describe("FIN-04E-06 EXCLUDE_ACCOUNT temporal semantics", () => {
  it("excludes only after-effective timed events from known impact", () => {
    const result = calculateEffectiveDatedScenarioAssumption({
      kind: "EXCLUDE_ACCOUNT",
      effectiveFromDateIso: "2027-07-01",
      baselineAmountMinor: 100_000,
      actualsThroughDateIso: cutoff,
      actualThroughCutoffMinor: 40_000,
      expectedEvents: [
        eventExact("2027-06-30", 30_000),
        eventExact("2027-09-30", 30_000),
      ],
    });
    expect(result.knownScenarioImpactMinor).toBe(-30_000);
    expect(result.eligibleTimedBaseAmountMinor).toBe(30_000);
    expect(result.unaffectedTimedBaseAmountMinor).toBe(30_000);
  });
});
