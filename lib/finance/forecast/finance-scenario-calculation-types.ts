import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";

/** Methodology identity for reproducibility (not persisted scenario versioning). */
export const FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION = "sce-scenario-v1" as const;

export type FinanceScenarioPlanningAccountSemantic = "INCOME" | "EXPENSE";

export type FinanceScenarioCalculationBaselineLine = {
  financialAccountId: string;
  amountMinor: number;
};

export type FinanceScenarioCalculationAccountSemantic = {
  financialAccountId: string;
  canonicalSemantic: FinanceScenarioPlanningAccountSemantic;
};

export type FinanceScenarioCalculationAssumption = {
  financialAccountId: string;
  kind: ScenarioAssumptionKindV1;
  percentBasisPoints?: number | null;
  amountMinorDelta?: number | null;
  absoluteAmountMinor?: number | null;
};

export type FinanceScenarioCalculationInput = {
  scenarioId: string;
  tenantId: string;
  financeYearId: string;
  baselineLines: readonly FinanceScenarioCalculationBaselineLine[];
  assumptions: readonly FinanceScenarioCalculationAssumption[];
  accountSemantics: readonly FinanceScenarioCalculationAccountSemantic[];
};

export type FinanceScenarioAccountResult = {
  financialAccountId: string;
  accountType: FinanceScenarioPlanningAccountSemantic;
  baselineAmountMinor: number;
  scenarioAmountMinor: number;
  deltaMinor: number;
  assumptionKind: ScenarioAssumptionKindV1 | null;
  assumptionApplied: boolean;
  resultContributionMinor: number;
};

export type FinanceScenarioAssumptionEffect = {
  financialAccountId: string;
  kind: ScenarioAssumptionKindV1;
  baselineAmountMinor: number;
  resultAmountMinor: number;
  deltaMinor: number;
  resultContributionMinor: number;
  percentBasisPoints: number | null;
  amountMinorDelta: number | null;
  absoluteAmountMinor: number | null;
};

export type FinanceScenarioCalculationTotals = {
  baselineIncomeMinor: number;
  baselineExpenseMinor: number;
  baselineResultMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
  incomeDeltaMinor: number;
  expenseDeltaMinor: number;
  resultDeltaMinor: number;
};

export type FinanceScenarioCalculationResult = {
  engineVersion: typeof FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION;
  scenarioId: string;
  tenantId: string;
  financeYearId: string;
  accountResults: FinanceScenarioAccountResult[];
  assumptionEffects: FinanceScenarioAssumptionEffect[];
  totals: FinanceScenarioCalculationTotals;
};
