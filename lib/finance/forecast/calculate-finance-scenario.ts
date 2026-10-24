import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import { applyScenarioAssumptionV1 } from "@/lib/finance/forecast/scenario-assumption-calculation";
import {
  failScenarioCalculation,
  FinanceScenarioCalculationError,
} from "@/lib/finance/forecast/finance-scenario-calculation-errors";
import {
  FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION,
  type FinanceScenarioAccountResult,
  type FinanceScenarioAssumptionEffect,
  type FinanceScenarioCalculationAssumption,
  type FinanceScenarioCalculationInput,
  type FinanceScenarioCalculationResult,
  type FinanceScenarioPlanningAccountSemantic,
} from "@/lib/finance/forecast/finance-scenario-calculation-types";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

function isPlanningSemantic(value: string): value is FinanceScenarioPlanningAccountSemantic {
  return value === "INCOME" || value === "EXPENSE";
}

function assertSafeScenarioAmount(amountMinor: number): void {
  try {
    assertSafeAmountMinor(amountMinor);
  } catch {
    failScenarioCalculation("UNSAFE_INTEGER_RESULT", "Scenario amount is not a safe integer.");
  }
}

function resultContributionMinorForDelta(
  accountType: FinanceScenarioPlanningAccountSemantic,
  deltaMinor: number,
): number {
  assertSafeScenarioAmount(deltaMinor);
  if (accountType === "INCOME") {
    return deltaMinor;
  }
  return -deltaMinor;
}

function compareAccountId(a: string, b: string): number {
  return a.localeCompare(b);
}

function buildBaselineMap(
  baselineLines: FinanceScenarioCalculationInput["baselineLines"],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of baselineLines) {
    if (!line.financialAccountId) {
      failScenarioCalculation("INVALID_SCENARIO_INPUT", "Baseline line missing account id.");
    }
    if (map.has(line.financialAccountId)) {
      failScenarioCalculation(
        "DUPLICATE_BASELINE_ACCOUNT",
        "Duplicate baseline account in calculation input.",
      );
    }
    assertSafeScenarioAmount(line.amountMinor);
    map.set(line.financialAccountId, line.amountMinor);
  }
  return map;
}

function buildAssumptionMap(
  assumptions: readonly FinanceScenarioCalculationAssumption[],
): Map<string, FinanceScenarioCalculationAssumption> {
  const map = new Map<string, FinanceScenarioCalculationAssumption>();
  for (const assumption of assumptions) {
    if (!assumption.financialAccountId) {
      failScenarioCalculation("INVALID_SCENARIO_INPUT", "Assumption missing account id.");
    }
    if (map.has(assumption.financialAccountId)) {
      failScenarioCalculation(
        "DUPLICATE_ASSUMPTION_ACCOUNT",
        "Duplicate assumption for the same account in calculation input.",
      );
    }
    map.set(assumption.financialAccountId, assumption);
  }
  return map;
}

function buildSemanticMap(
  accountSemantics: FinanceScenarioCalculationInput["accountSemantics"],
  baselineAccountIds: Set<string>,
): Map<string, FinanceScenarioPlanningAccountSemantic> {
  const map = new Map<string, FinanceScenarioPlanningAccountSemantic>();
  for (const row of accountSemantics) {
    if (!isPlanningSemantic(row.canonicalSemantic)) {
      failScenarioCalculation(
        "UNSUPPORTED_ACCOUNT_TYPE",
        "Scenario calculation requires income or expense account semantics.",
      );
    }
    map.set(row.financialAccountId, row.canonicalSemantic);
  }
  for (const accountId of baselineAccountIds) {
    if (!map.has(accountId)) {
      failScenarioCalculation(
        "INVALID_SCENARIO_INPUT",
        "Missing account semantic metadata for a baseline account.",
      );
    }
  }
  return map;
}

function applyAssumptionToBaseline(
  baselineAmountMinor: number,
  assumption: FinanceScenarioCalculationAssumption,
): number {
  let applied;
  try {
    applied = applyScenarioAssumptionV1({
      baselineAmountMinor,
      kind: assumption.kind,
      percentBasisPoints: assumption.percentBasisPoints ?? undefined,
      amountMinorDelta: assumption.amountMinorDelta ?? undefined,
      absoluteAmountMinor: assumption.absoluteAmountMinor ?? undefined,
    });
  } catch {
    failScenarioCalculation(
      "UNSAFE_INTEGER_RESULT",
      "Scenario calculation exceeded safe integer bounds.",
    );
  }
  if (applied.rejectedReason) {
    failScenarioCalculation(
      "INVALID_ASSUMPTION_PAYLOAD",
      `Assumption could not be applied: ${applied.rejectedReason}`,
    );
  }
  if (applied.scenarioAmountMinor === null) {
    failScenarioCalculation("INVALID_ASSUMPTION_PAYLOAD", "Assumption produced no scenario amount.");
  }
  assertSafeScenarioAmount(applied.scenarioAmountMinor);
  return applied.scenarioAmountMinor;
}

/** Pure deterministic scenario engine — frozen baseline + assumptions → derived result. */
export function calculateFinanceScenario(
  input: FinanceScenarioCalculationInput,
): FinanceScenarioCalculationResult {
  if (!input.scenarioId || !input.tenantId || !input.financeYearId) {
    failScenarioCalculation("INVALID_SCENARIO_INPUT", "Scenario identity is incomplete.");
  }

  const baselineByAccount = buildBaselineMap(input.baselineLines);
  const assumptionByAccount = buildAssumptionMap(input.assumptions);
  const baselineAccountIds = new Set(baselineByAccount.keys());
  const semanticByAccount = buildSemanticMap(input.accountSemantics, baselineAccountIds);

  for (const assumptionAccountId of assumptionByAccount.keys()) {
    if (!baselineByAccount.has(assumptionAccountId)) {
      failScenarioCalculation(
        "ASSUMPTION_ACCOUNT_NOT_IN_BASELINE",
        "Assumption references an account that is not in the frozen baseline.",
      );
    }
  }

  const orderedAccountIds = [...baselineAccountIds].sort(compareAccountId);

  const accountResults: FinanceScenarioAccountResult[] = [];
  const assumptionEffects: FinanceScenarioAssumptionEffect[] = [];

  for (const financialAccountId of orderedAccountIds) {
    const baselineAmountMinor = baselineByAccount.get(financialAccountId)!;
    const accountType = semanticByAccount.get(financialAccountId)!;
    const assumption = assumptionByAccount.get(financialAccountId);

    let scenarioAmountMinor = baselineAmountMinor;
    if (assumption) {
      scenarioAmountMinor = applyAssumptionToBaseline(baselineAmountMinor, assumption);
    }

    const deltaMinor = scenarioAmountMinor - baselineAmountMinor;
    assertSafeScenarioAmount(deltaMinor);

    const resultContributionMinor = assumption
      ? resultContributionMinorForDelta(accountType, deltaMinor)
      : 0;

    accountResults.push({
      financialAccountId,
      accountType,
      baselineAmountMinor,
      scenarioAmountMinor,
      deltaMinor,
      assumptionKind: assumption?.kind ?? null,
      assumptionApplied: Boolean(assumption),
      resultContributionMinor,
    });

    if (assumption) {
      assumptionEffects.push({
        financialAccountId,
        kind: assumption.kind,
        baselineAmountMinor,
        resultAmountMinor: scenarioAmountMinor,
        deltaMinor,
        resultContributionMinor,
        percentBasisPoints: assumption.percentBasisPoints ?? null,
        amountMinorDelta: assumption.amountMinorDelta ?? null,
        absoluteAmountMinor: assumption.absoluteAmountMinor ?? null,
      });
    }
  }

  assumptionEffects.sort((a, b) => compareAccountId(a.financialAccountId, b.financialAccountId));

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

  assertFinanceScenarioCalculationIntegrity({
    accountResults,
    assumptionEffects,
    totals,
  });

  return {
    engineVersion: FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION,
    scenarioId: input.scenarioId,
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    accountResults,
    assumptionEffects,
    totals,
  };
}

export function assertFinanceScenarioCalculationIntegrity(result: {
  accountResults: FinanceScenarioAccountResult[];
  assumptionEffects: FinanceScenarioAssumptionEffect[];
  totals: FinanceScenarioCalculationResult["totals"];
}): void {
  const accountIds = new Set<string>();
  for (const row of result.accountResults) {
    if (accountIds.has(row.financialAccountId)) {
      throw new FinanceScenarioCalculationError(
        "INVALID_SCENARIO_INPUT",
        "Duplicate account in scenario account results.",
      );
    }
    accountIds.add(row.financialAccountId);
    assertSafeScenarioAmount(row.scenarioAmountMinor);
    if (row.deltaMinor !== row.scenarioAmountMinor - row.baselineAmountMinor) {
      throw new FinanceScenarioCalculationError(
        "INVALID_SCENARIO_INPUT",
        "Account delta does not match scenario minus baseline.",
      );
    }
  }

  const baselineTotals = computeBudgetPlanningTotals(
    result.accountResults.map((row) => ({
      amountMinor: row.baselineAmountMinor,
      financialAccount: { canonicalSemantic: row.accountType },
    })),
  );
  const scenarioTotals = computeBudgetPlanningTotals(
    result.accountResults.map((row) => ({
      amountMinor: row.scenarioAmountMinor,
      financialAccount: { canonicalSemantic: row.accountType },
    })),
  );

  if (baselineTotals.totalIncomeMinor !== result.totals.baselineIncomeMinor) {
    throw new FinanceScenarioCalculationError(
      "INVALID_SCENARIO_INPUT",
      "Baseline income total integrity check failed.",
    );
  }
  if (scenarioTotals.totalIncomeMinor !== result.totals.incomeMinor) {
    throw new FinanceScenarioCalculationError(
      "INVALID_SCENARIO_INPUT",
      "Scenario income total integrity check failed.",
    );
  }

  const contributionSum = result.assumptionEffects.reduce(
    (sum, effect) => sum + effect.resultContributionMinor,
    0,
  );
  if (contributionSum !== result.totals.resultDeltaMinor) {
    throw new FinanceScenarioCalculationError(
      "INVALID_SCENARIO_INPUT",
      "Sum of assumption result contributions must equal result delta.",
    );
  }
}
