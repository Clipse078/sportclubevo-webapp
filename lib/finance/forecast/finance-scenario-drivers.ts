import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import type { FinanceScenarioAssumptionEffect } from "@/lib/finance/forecast/finance-scenario-calculation-types";
import type {
  FinanceScenarioAccountPresentation,
  FinanceScenarioDriver,
} from "@/lib/finance/forecast/finance-scenario-read-model";
import {
  FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT,
} from "@/lib/finance/forecast/finance-scenario-read-model";

export { FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT };

function compareDriverOrder(a: FinanceScenarioDriver, b: FinanceScenarioDriver): number {
  const absDiff =
    b.absoluteResultContributionMinor - a.absoluteResultContributionMinor;
  if (absDiff !== 0) return absDiff;
  return a.financialAccountId.localeCompare(b.financialAccountId);
}

export function buildFinanceScenarioDrivers(input: {
  assumptionEffects: readonly FinanceScenarioAssumptionEffect[];
  accountPresentationById: ReadonlyMap<string, FinanceScenarioAccountPresentation>;
  assumptionKindByAccountId: ReadonlyMap<string, ScenarioAssumptionKindV1>;
}): FinanceScenarioDriver[] {
  const drivers: FinanceScenarioDriver[] = [];
  for (const effect of input.assumptionEffects) {
    const account = input.accountPresentationById.get(effect.financialAccountId);
    const kind = input.assumptionKindByAccountId.get(effect.financialAccountId);
    if (!account || !kind) {
      continue;
    }
    drivers.push({
      financialAccountId: effect.financialAccountId,
      account,
      assumptionKind: kind,
      baselineAmountMinor: effect.baselineAmountMinor,
      scenarioAmountMinor: effect.resultAmountMinor,
      accountDeltaMinor: effect.deltaMinor,
      resultContributionMinor: effect.resultContributionMinor,
      absoluteResultContributionMinor: Math.abs(effect.resultContributionMinor),
    });
  }
  return drivers.sort(compareDriverOrder);
}

export function selectTopFinanceScenarioDrivers(
  drivers: readonly FinanceScenarioDriver[],
  limit = FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT,
): FinanceScenarioDriver[] {
  return drivers
    .filter((driver) => driver.resultContributionMinor !== 0)
    .slice(0, limit);
}
