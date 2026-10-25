/**
 * FIN-04E-06 — merge annual FIN-04D calculation with effective-dated temporal results.
 */

import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import {
  assertFinanceScenarioCalculationIntegrity,
  calculateFinanceScenario,
} from "@/lib/finance/forecast/calculate-finance-scenario";
import { calculateEffectiveDatedScenarioAssumption } from "@/lib/finance/forecast/calculate-effective-dated-scenario-assumption";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";
import type {
  FinanceScenarioCalculationAssumption,
  FinanceScenarioCalculationInput,
  FinanceScenarioCalculationResult,
  FinanceScenarioPlanningAccountSemantic,
} from "@/lib/finance/forecast/finance-scenario-calculation-types";
import type { ScenarioTemporalCoverageState } from "@/lib/finance/forecast/effective-dated-scenario-architecture-contract";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type ScenarioAccountTemporalEvidence = {
  actualsThroughDateIso: string;
  actualThroughCutoffMinor: number;
  expectedEvents: ReadonlyArray<ExpectedFinancialEventForReconciliation>;
  timingEvidenceUpdatedAtIso: string | null;
};

export type FinanceScenarioAssumptionTemporalReadModel = {
  financialAccountId: string;
  effectiveFromDateIso: string;
  temporalCoverageState: ScenarioTemporalCoverageState;
  eligibleTimedBaseAmountMinor: number;
  unaffectedTimedBaseAmountMinor: number;
  ambiguousBaseAmountMinor: number;
  unscheduledBaseAmountMinor: number;
  knownScenarioImpactMinor: number;
  undeterminedBaseAmountMinor: number;
  temporalStale: boolean;
  adoptionEligible: boolean;
  temporalSupportState: "EFFECTIVE_DATED" | "ANNUAL_FULL_SCOPE";
};

export type FinanceScenarioTemporalSummary = {
  hasEffectiveDatedAssumptions: boolean;
  adoptionEligible: boolean;
  temporalStale: boolean;
  partialTemporalCoverage: boolean;
  assumptionTemporalByAccountId: ReadonlyMap<string, FinanceScenarioAssumptionTemporalReadModel>;
};

export type FinanceScenarioCalculationWithTemporalResult = FinanceScenarioCalculationResult & {
  temporal: FinanceScenarioTemporalSummary;
};

function resultContributionMinorForDelta(
  accountType: FinanceScenarioPlanningAccountSemantic,
  deltaMinor: number,
): number {
  assertSafeAmountMinor(deltaMinor);
  return accountType === "INCOME" ? deltaMinor : -deltaMinor;
}

function splitAssumptions(assumptions: readonly FinanceScenarioCalculationAssumption[]): {
  annual: FinanceScenarioCalculationAssumption[];
  effectiveDated: FinanceScenarioCalculationAssumption[];
} {
  const annual: FinanceScenarioCalculationAssumption[] = [];
  const effectiveDated: FinanceScenarioCalculationAssumption[] = [];
  for (const assumption of assumptions) {
    if (assumption.effectiveFromDateIso) {
      effectiveDated.push(assumption);
    } else {
      annual.push(assumption);
    }
  }
  return { annual, effectiveDated };
}

export function calculateFinanceScenarioWithTemporalSupport(input: {
  calculationInput: FinanceScenarioCalculationInput;
  temporalEvidenceByAccountId: ReadonlyMap<string, ScenarioAccountTemporalEvidence>;
  scenarioUpdatedAtIso: string;
}): FinanceScenarioCalculationWithTemporalResult {
  const { annual, effectiveDated } = splitAssumptions(input.calculationInput.assumptions);

  const annualOnlyInput: FinanceScenarioCalculationInput = {
    ...input.calculationInput,
    assumptions: [
      ...annual,
      ...effectiveDated.map((assumption) => ({
        ...assumption,
        effectiveFromDateIso: null,
      })),
    ],
  };

  const baseCalculation =
    effectiveDated.length === 0
      ? calculateFinanceScenario(input.calculationInput)
      : calculateFinanceScenario(annualOnlyInput);

  if (effectiveDated.length === 0) {
    return {
      ...baseCalculation,
      temporal: {
        hasEffectiveDatedAssumptions: false,
        adoptionEligible: true,
        temporalStale: false,
        partialTemporalCoverage: false,
        assumptionTemporalByAccountId: new Map(),
      },
    };
  }

  const assumptionTemporalByAccountId = new Map<
    string,
    FinanceScenarioAssumptionTemporalReadModel
  >();
  const accountResults = baseCalculation.accountResults.map((row) => ({ ...row }));
  const assumptionEffects = baseCalculation.assumptionEffects.map((effect) => ({ ...effect }));

  let scenarioUpdatedMs = Date.parse(input.scenarioUpdatedAtIso);
  if (Number.isNaN(scenarioUpdatedMs)) {
    scenarioUpdatedMs = 0;
  }

  for (const assumption of effectiveDated) {
    const evidence = input.temporalEvidenceByAccountId.get(assumption.financialAccountId);
    if (!evidence) {
      throw new Error("FINANCE_SCENARIO_TEMPORAL_EVIDENCE_MISSING");
    }

    const baselineRow = accountResults.find(
      (row) => row.financialAccountId === assumption.financialAccountId,
    );
    if (!baselineRow) {
      throw new Error("FINANCE_SCENARIO_TEMPORAL_BASELINE_MISSING");
    }

    const temporal = calculateEffectiveDatedScenarioAssumption({
      kind: assumption.kind,
      percentBasisPoints: assumption.percentBasisPoints,
      effectiveFromDateIso: assumption.effectiveFromDateIso!,
      baselineAmountMinor: baselineRow.baselineAmountMinor,
      actualsThroughDateIso: evidence.actualsThroughDateIso,
      actualThroughCutoffMinor: evidence.actualThroughCutoffMinor,
      expectedEvents: evidence.expectedEvents,
    });

    let timingEvidenceUpdatedMs = 0;
    if (evidence.timingEvidenceUpdatedAtIso) {
      timingEvidenceUpdatedMs = Date.parse(evidence.timingEvidenceUpdatedAtIso);
    }
    const temporalStale =
      timingEvidenceUpdatedMs > 0 && timingEvidenceUpdatedMs > scenarioUpdatedMs;

    assumptionTemporalByAccountId.set(assumption.financialAccountId, {
      financialAccountId: assumption.financialAccountId,
      effectiveFromDateIso: temporal.effectiveFromDateIso,
      temporalCoverageState: temporal.temporalCoverageState,
      eligibleTimedBaseAmountMinor: temporal.eligibleTimedBaseAmountMinor,
      unaffectedTimedBaseAmountMinor: temporal.unaffectedTimedBaseAmountMinor,
      ambiguousBaseAmountMinor: temporal.ambiguousBaseAmountMinor,
      unscheduledBaseAmountMinor: temporal.unscheduledBaseAmountMinor,
      knownScenarioImpactMinor: temporal.knownScenarioImpactMinor,
      undeterminedBaseAmountMinor: temporal.undeterminedBaseAmountMinor,
      temporalStale,
      adoptionEligible: temporal.adoptionEligible,
      temporalSupportState: "EFFECTIVE_DATED",
    });

    if (temporal.adoptionEligible) {
      baselineRow.scenarioAmountMinor = temporal.annualScenarioAmountMinor;
      baselineRow.deltaMinor =
        temporal.annualScenarioAmountMinor - baselineRow.baselineAmountMinor;
      baselineRow.resultContributionMinor = resultContributionMinorForDelta(
        baselineRow.accountType,
        baselineRow.deltaMinor,
      );

      const effectIndex = assumptionEffects.findIndex(
        (effect) => effect.financialAccountId === assumption.financialAccountId,
      );
      if (effectIndex >= 0) {
        assumptionEffects[effectIndex] = {
          ...assumptionEffects[effectIndex]!,
          resultAmountMinor: temporal.annualScenarioAmountMinor,
          deltaMinor: baselineRow.deltaMinor,
          resultContributionMinor: baselineRow.resultContributionMinor,
        };
      } else {
        assumptionEffects.push({
          financialAccountId: assumption.financialAccountId,
          kind: assumption.kind as ScenarioAssumptionKindV1,
          baselineAmountMinor: baselineRow.baselineAmountMinor,
          resultAmountMinor: temporal.annualScenarioAmountMinor,
          deltaMinor: baselineRow.deltaMinor,
          resultContributionMinor: baselineRow.resultContributionMinor,
          percentBasisPoints: assumption.percentBasisPoints ?? null,
          amountMinorDelta: assumption.amountMinorDelta ?? null,
          absoluteAmountMinor: assumption.absoluteAmountMinor ?? null,
        });
      }
    }
  }

  assumptionEffects.sort((a, b) =>
    a.financialAccountId.localeCompare(b.financialAccountId),
  );

  const baselineTotals = computeBudgetPlanningTotals(
    accountResults.map((row) => ({
      amountMinor: row.baselineAmountMinor,
      financialAccount: { canonicalSemantic: row.accountType },
    })),
  );
  const scenarioTotals = computeBudgetPlanningTotals(
    accountResults.map((row) => ({
      amountMinor: row.scenarioAmountMinor,
      financialAccount: { canonicalSemantic: row.accountType },
    })),
  );

  const totals = {
    baselineIncomeMinor: baselineTotals.totalIncomeMinor,
    baselineExpenseMinor: baselineTotals.totalExpenseMinor,
    baselineResultMinor: baselineTotals.resultMinor,
    incomeMinor: scenarioTotals.totalIncomeMinor,
    expenseMinor: scenarioTotals.totalExpenseMinor,
    resultMinor: scenarioTotals.resultMinor,
    incomeDeltaMinor: scenarioTotals.totalIncomeMinor - baselineTotals.totalIncomeMinor,
    expenseDeltaMinor: scenarioTotals.totalExpenseMinor - baselineTotals.totalExpenseMinor,
    resultDeltaMinor: scenarioTotals.resultMinor - baselineTotals.resultMinor,
  };

  const merged: FinanceScenarioCalculationResult = {
    ...baseCalculation,
    accountResults,
    assumptionEffects,
    totals,
  };

  assertFinanceScenarioCalculationIntegrity(merged);

  const temporalValues = [...assumptionTemporalByAccountId.values()];
  const adoptionEligible = temporalValues.every((row) => row.adoptionEligible);
  const temporalStale = temporalValues.some((row) => row.temporalStale);
  const partialTemporalCoverage = temporalValues.some(
    (row) => row.temporalCoverageState !== "COMPLETE",
  );

  return {
    ...merged,
    temporal: {
      hasEffectiveDatedAssumptions: true,
      adoptionEligible,
      temporalStale,
      partialTemporalCoverage,
      assumptionTemporalByAccountId,
    },
  };
}
