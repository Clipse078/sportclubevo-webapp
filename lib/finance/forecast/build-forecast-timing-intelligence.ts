/**
 * FIN-04E-04 — pure forecast timing intelligence (reconciliation aggregation, ranking, coverage).
 */

import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import { compareExpectedFinancialEventsForUpcoming } from "@/lib/finance/forecast/compare-expected-financial-events";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { ExpectedFinancialEventForReconciliation } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";
import { reconcileExpectedFinancialTiming } from "@/lib/finance/forecast/reconcile-expected-financial-timing";
import type {
  FinanceForecastTimingAccountReadModel,
  FinanceForecastTimingAccountReconciliation,
  FinanceForecastTimingCoverage,
  FinanceForecastTimingCurrentForecastContext,
  FinanceForecastTimingException,
  FinanceForecastTimingInterpretationState,
  FinanceForecastTimingOverviewReadModel,
  FinanceForecastTimingSideTotals,
  FinanceForecastTimingUpcomingEventReadModel,
} from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import { FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY } from "@/lib/finance/forecast/finance-forecast-timing-read-model";

const BASIS_POINTS_SCALE = 10_000;

export type BuildForecastTimingIntelligenceInput = {
  financeYearId: string;
  actualsThroughDateIso: string;
  currentForecast: FinanceForecastTimingCurrentForecastContext;
  planningAccounts: ReadonlyArray<{
    id: string;
    name: string;
    accountType: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  /** Annual forecast amount per account when a current forecast line exists. */
  forecastAmountByAccountId: ReadonlyMap<string, number>;
  actualThroughCutoffByAccountId: ReadonlyMap<string, number>;
  /** Events owned by this finance year (financeYearId scope). */
  events: ReadonlyArray<ExpectedFinancialEventRecord>;
  upcomingLimit?: number;
};

function emptySideTotals(): FinanceForecastTimingSideTotals {
  return {
    annualForecastMinor: 0,
    actualThroughCutoffMinor: 0,
    remainingFutureExpectationMinor: 0,
    timedFutureExpectationMinor: 0,
    ambiguousTimingExpectationMinor: 0,
    unscheduledRemainderMinor: 0,
    overallocatedAmountMinor: 0,
    actualExceedsAnnualForecastAmountMinor: 0,
    futureTimedMovementMinor: 0,
  };
}

function addToSide(
  side: FinanceForecastTimingSideTotals,
  reconciliation: FinanceForecastTimingAccountReconciliation,
): void {
  side.annualForecastMinor += reconciliation.annualForecastAmountMinor ?? 0;
  side.actualThroughCutoffMinor += reconciliation.actualThroughCutoffMinor;
  side.remainingFutureExpectationMinor += reconciliation.remainingFutureExpectationMinor ?? 0;
  side.timedFutureExpectationMinor += reconciliation.timedFutureExpectationMinor;
  side.ambiguousTimingExpectationMinor += reconciliation.ambiguousTimingExpectationMinor;
  side.unscheduledRemainderMinor += reconciliation.unscheduledRemainderMinor ?? 0;
  side.overallocatedAmountMinor += reconciliation.overallocatedAmountMinor ?? 0;
  side.actualExceedsAnnualForecastAmountMinor +=
    reconciliation.actualExceedsAnnualForecastAmountMinor ?? 0;
  side.futureTimedMovementMinor += reconciliation.timedFutureExpectationMinor;
}

function computeCoverage(
  remainingFutureExpectationMinor: number,
  timedFutureExpectationMinor: number,
  overallocatedAmountMinor: number,
): FinanceForecastTimingCoverage {
  if (remainingFutureExpectationMinor <= 0) {
    return { kind: "NO_REMAINING_EXPECTATION" };
  }
  const rawRatio = Math.floor(
    (timedFutureExpectationMinor * BASIS_POINTS_SCALE) / remainingFutureExpectationMinor,
  );
  const isOverallocated = overallocatedAmountMinor > 0;
  const capped = isOverallocated
    ? Math.min(BASIS_POINTS_SCALE, rawRatio)
    : Math.min(BASIS_POINTS_SCALE, rawRatio);
  return {
    kind: "RATIO",
    remainingFutureExpectationMinor,
    timedFutureExpectationMinor,
    timedCoverageBasisPoints: capped,
    rawTimedCoverageBasisPoints: isOverallocated ? rawRatio : null,
    isOverallocated,
  };
}

function accountRankTier(account: FinanceForecastTimingAccountReadModel): number {
  if (account.reconciliation.state === "OVERALLOCATED") return 0;
  if (
    account.reconciliation.state === "FORECAST_LINE_ABSENT" &&
    account.expectedEventCount > 0
  ) {
    return 1;
  }
  if (account.reconciliation.ambiguousTimingExpectationMinor > 0) return 2;
  if ((account.reconciliation.unscheduledRemainderMinor ?? 0) > 0) return 3;
  return 4;
}

function accountMaterialityScore(account: FinanceForecastTimingAccountReadModel): number {
  return Math.max(
    account.reconciliation.overallocatedAmountMinor ?? 0,
    account.reconciliation.unscheduledRemainderMinor ?? 0,
    account.reconciliation.ambiguousTimingExpectationMinor,
    account.reconciliation.actualExceedsAnnualForecastAmountMinor ?? 0,
  );
}

export function compareFinanceForecastTimingAccounts(
  a: FinanceForecastTimingAccountReadModel,
  b: FinanceForecastTimingAccountReadModel,
): number {
  const tierDiff = accountRankTier(a) - accountRankTier(b);
  if (tierDiff !== 0) return tierDiff;
  const materialityDiff = accountMaterialityScore(b) - accountMaterialityScore(a);
  if (materialityDiff !== 0) return materialityDiff;
  return a.financialAccountId.localeCompare(b.financialAccountId);
}

function resolveInterpretationState(input: {
  accounts: FinanceForecastTimingAccountReadModel[];
  income: FinanceForecastTimingSideTotals;
  expense: FinanceForecastTimingSideTotals;
}): FinanceForecastTimingInterpretationState {
  const totalRemaining =
    input.income.remainingFutureExpectationMinor +
    input.expense.remainingFutureExpectationMinor;
  const totalOverallocated =
    input.income.overallocatedAmountMinor + input.expense.overallocatedAmountMinor;

  if (totalOverallocated > 0) {
    return "OVERALLOCATED";
  }

  const needsAttention = input.accounts.some(
    (account) =>
      (account.reconciliation.state === "FORECAST_LINE_ABSENT" &&
        account.expectedEventCount > 0) ||
      account.reconciliation.ambiguousTimingExpectationMinor > 0 ||
      (account.reconciliation.actualExceedsAnnualForecastAmountMinor ?? 0) > 0,
  );
  if (needsAttention) {
    return "ATTENTION_REQUIRED";
  }

  if (totalRemaining <= 0) {
    return "NO_REMAINING_EXPECTATION";
  }

  const totalUnscheduled =
    input.income.unscheduledRemainderMinor + input.expense.unscheduledRemainderMinor;
  if (totalUnscheduled > 0) {
    return "PARTIALLY_SCHEDULED";
  }

  return "FULLY_SCHEDULED";
}

function buildExceptions(
  accounts: FinanceForecastTimingAccountReadModel[],
): FinanceForecastTimingException[] {
  const exceptions: FinanceForecastTimingException[] = [];

  for (const account of accounts) {
    const { reconciliation, financialAccountId, expectedEventCount, ambiguousEventCount } =
      account;

    if (reconciliation.state === "OVERALLOCATED") {
      exceptions.push({
        kind: "OVERALLOCATED",
        financialAccountId,
        amountMinor: reconciliation.overallocatedAmountMinor ?? 0,
        eventCount: account.futureTimedEventCount + ambiguousEventCount,
        attentionPriority: 1,
      });
    }

    if (reconciliation.state === "FORECAST_LINE_ABSENT" && expectedEventCount > 0) {
      exceptions.push({
        kind: "FORECAST_LINE_MISSING",
        financialAccountId,
        amountMinor: account.reconciliation.timedFutureExpectationMinor +
          account.reconciliation.ambiguousTimingExpectationMinor,
        eventCount: expectedEventCount,
        attentionPriority: 2,
      });
    }

    if (account.reconciliation.ambiguousTimingExpectationMinor > 0) {
      exceptions.push({
        kind: "AMBIGUOUS_AT_CUTOFF",
        financialAccountId,
        amountMinor: account.reconciliation.ambiguousTimingExpectationMinor,
        eventCount: ambiguousEventCount,
        attentionPriority: 3,
      });
    }

    if ((reconciliation.unscheduledRemainderMinor ?? 0) > 0) {
      exceptions.push({
        kind: "UNSCHEDULED_REMAINDER",
        financialAccountId,
        amountMinor: reconciliation.unscheduledRemainderMinor ?? 0,
        eventCount: null,
        attentionPriority: 5,
      });
    }
  }

  return exceptions.sort((a, b) => {
    if (a.attentionPriority !== b.attentionPriority) {
      return a.attentionPriority - b.attentionPriority;
    }
    if (b.amountMinor !== a.amountMinor) {
      return b.amountMinor - a.amountMinor;
    }
    return (a.financialAccountId ?? "").localeCompare(b.financialAccountId ?? "");
  });
}

function toSourcePresentation(event: ExpectedFinancialEventRecord) {
  return {
    sourceKind: event.sourceKind,
    isManual: event.sourceKind === "MANUAL",
    hasExternalSourceReference: event.sourceRefType != null && event.sourceRefId != null,
  };
}

function countEventPositions(
  actualsThroughDateIso: string,
  events: ReadonlyArray<ExpectedFinancialEventForReconciliation>,
): { futureTimed: number; ambiguous: number } {
  let futureTimed = 0;
  let ambiguous = 0;
  for (const event of events) {
    const position = classifyExpectedEventTemporalPosition(actualsThroughDateIso, event);
    if (position === "FUTURE_TIMED") futureTimed += 1;
    if (position === "AMBIGUOUS_AT_CUTOFF") ambiguous += 1;
  }
  return { futureTimed, ambiguous };
}

export function buildForecastTimingIntelligence(
  input: BuildForecastTimingIntelligenceInput,
): FinanceForecastTimingOverviewReadModel {
  const accountById = new Map(input.planningAccounts.map((account) => [account.id, account]));
  const eventsByAccount = new Map<string, ExpectedFinancialEventRecord[]>();
  for (const event of input.events) {
    const bucket = eventsByAccount.get(event.financialAccountId) ?? [];
    bucket.push(event);
    eventsByAccount.set(event.financialAccountId, bucket);
  }

  const includedAccountIds = new Set<string>();
  for (const accountId of input.forecastAmountByAccountId.keys()) {
    includedAccountIds.add(accountId);
  }
  for (const [accountId, amount] of input.actualThroughCutoffByAccountId) {
    if (amount > 0) includedAccountIds.add(accountId);
  }
  for (const accountId of eventsByAccount.keys()) {
    includedAccountIds.add(accountId);
  }

  const accountModels: FinanceForecastTimingAccountReadModel[] = [];

  for (const accountId of includedAccountIds) {
    const presentation = accountById.get(accountId);
    if (!presentation) continue;

    const forecastLinePresent = input.forecastAmountByAccountId.has(accountId);
    const annualForecastAmountMinor = forecastLinePresent
      ? (input.forecastAmountByAccountId.get(accountId) ?? null)
      : null;
    const actualThroughCutoffMinor = input.actualThroughCutoffByAccountId.get(accountId) ?? 0;
    const accountEvents = eventsByAccount.get(accountId) ?? [];
    const reconciliationEvents = accountEvents.map((event) => ({
      expectedAmountMinor: event.expectedAmountMinor,
      timingPrecision: event.timingPrecision,
      expectedDateIso: event.expectedDateIso,
      expectedMonthStartIso: event.expectedMonthStartIso,
      rangeStartDateIso: event.rangeStartDateIso,
      rangeEndDateIso: event.rangeEndDateIso,
    }));

    const pure = reconcileExpectedFinancialTiming({
      annualForecastAmountMinor,
      actualThroughCutoffMinor,
      actualsThroughDateIso: input.actualsThroughDateIso,
      expectedEvents: reconciliationEvents,
    });

    const positions = countEventPositions(input.actualsThroughDateIso, reconciliationEvents);

    let timedFutureExpectationMinor = pure.timedFutureExpectationMinor;
    let ambiguousTimingExpectationMinor = pure.ambiguousTimingExpectationMinor;
    if (!forecastLinePresent && accountEvents.length > 0) {
      timedFutureExpectationMinor = accountEvents.reduce((total, event, index) => {
        const position = classifyExpectedEventTemporalPosition(input.actualsThroughDateIso, {
          expectedAmountMinor: reconciliationEvents[index]!.expectedAmountMinor,
          timingPrecision: reconciliationEvents[index]!.timingPrecision,
          expectedDateIso: reconciliationEvents[index]!.expectedDateIso,
          expectedMonthStartIso: reconciliationEvents[index]!.expectedMonthStartIso,
          rangeStartDateIso: reconciliationEvents[index]!.rangeStartDateIso,
          rangeEndDateIso: reconciliationEvents[index]!.rangeEndDateIso,
        });
        return position === "FUTURE_TIMED" ? total + event.expectedAmountMinor : total;
      }, 0);
      ambiguousTimingExpectationMinor = accountEvents.reduce((total, event, index) => {
        const position = classifyExpectedEventTemporalPosition(input.actualsThroughDateIso, {
          expectedAmountMinor: reconciliationEvents[index]!.expectedAmountMinor,
          timingPrecision: reconciliationEvents[index]!.timingPrecision,
          expectedDateIso: reconciliationEvents[index]!.expectedDateIso,
          expectedMonthStartIso: reconciliationEvents[index]!.expectedMonthStartIso,
          rangeStartDateIso: reconciliationEvents[index]!.rangeStartDateIso,
          rangeEndDateIso: reconciliationEvents[index]!.rangeEndDateIso,
        });
        return position === "AMBIGUOUS_AT_CUTOFF" ? total + event.expectedAmountMinor : total;
      }, 0);
    }

    const reconciliation: FinanceForecastTimingAccountReconciliation = {
      annualForecastAmountMinor: pure.annualForecastAmountMinor,
      forecastLinePresent,
      actualThroughCutoffMinor: pure.actualThroughCutoffMinor,
      remainingFutureExpectationMinor: pure.remainingFutureExpectationMinor,
      timedFutureExpectationMinor,
      ambiguousTimingExpectationMinor,
      unscheduledRemainderMinor: pure.unscheduledRemainderMinor,
      overallocatedAmountMinor: pure.overallocatedAmountMinor,
      actualExceedsAnnualForecastAmountMinor: pure.actualExceedsAnnualForecastAmountMinor,
      state: pure.state,
    };

    accountModels.push({
      financialAccountId: accountId,
      name: presentation.name,
      accountType: presentation.accountType,
      lifecycle: presentation.lifecycle,
      rank: 0,
      reconciliation,
      expectedEventCount: accountEvents.length,
      futureTimedEventCount: positions.futureTimed,
      ambiguousEventCount: positions.ambiguous,
      nextExpectedEventId: null,
    });
  }

  accountModels.sort(compareFinanceForecastTimingAccounts);
  accountModels.forEach((account, index) => {
    account.rank = index + 1;
  });

  const income = emptySideTotals();
  const expense = emptySideTotals();
  for (const account of accountModels) {
    const side = account.accountType === "INCOME" ? income : expense;
    addToSide(side, account.reconciliation);
  }

  const totalRemaining =
    income.remainingFutureExpectationMinor + expense.remainingFutureExpectationMinor;
  const totalTimed =
    income.timedFutureExpectationMinor + expense.timedFutureExpectationMinor;
  const totalOverallocated =
    income.overallocatedAmountMinor + expense.overallocatedAmountMinor;

  let timingCoverage: FinanceForecastTimingCoverage;
  if (input.currentForecast.kind === "UNAVAILABLE") {
    timingCoverage = { kind: "NOT_COMPUTABLE", reason: "NO_CURRENT_FORECAST" };
  } else if (
    input.forecastAmountByAccountId.size === 0 &&
    accountModels.every((a) => !a.reconciliation.forecastLinePresent)
  ) {
    timingCoverage = { kind: "NOT_COMPUTABLE", reason: "MISSING_ANNUAL_LINES" };
  } else {
    timingCoverage = computeCoverage(totalRemaining, totalTimed, totalOverallocated);
  }

  const upcomingLimit =
    input.upcomingLimit ?? FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY.upcomingDefaultLimit;

  const futureTimedEvents = input.events.filter(
    (event) =>
      classifyExpectedEventTemporalPosition(input.actualsThroughDateIso, {
        expectedAmountMinor: event.expectedAmountMinor,
        timingPrecision: event.timingPrecision,
        expectedDateIso: event.expectedDateIso,
        expectedMonthStartIso: event.expectedMonthStartIso,
        rangeStartDateIso: event.rangeStartDateIso,
        rangeEndDateIso: event.rangeEndDateIso,
      }) === "FUTURE_TIMED",
  );

  const sortedUpcoming = [...futureTimedEvents].sort(compareExpectedFinancialEventsForUpcoming);
  const upcomingEvents: FinanceForecastTimingUpcomingEventReadModel[] = sortedUpcoming
    .slice(0, upcomingLimit)
    .map((event, index) => {
      const account = accountById.get(event.financialAccountId);
      return {
        eventId: event.id,
        financialAccountId: event.financialAccountId,
        accountType: account?.accountType ?? "INCOME",
        accountName: account?.name ?? event.financialAccountId,
        expectedAmountMinor: event.expectedAmountMinor,
        timingPrecision: event.timingPrecision,
        expectedDateIso: event.expectedDateIso,
        expectedMonthStartIso: event.expectedMonthStartIso,
        rangeStartDateIso: event.rangeStartDateIso,
        rangeEndDateIso: event.rangeEndDateIso,
        sourcePresentation: toSourcePresentation(event),
        description: event.description,
        rank: index + 1,
      };
    });

  const nextEventByAccount = new Map<string, string>();
  for (const event of sortedUpcoming) {
    if (!nextEventByAccount.has(event.financialAccountId)) {
      nextEventByAccount.set(event.financialAccountId, event.id);
    }
  }
  for (const account of accountModels) {
    account.nextExpectedEventId =
      nextEventByAccount.get(account.financialAccountId) ?? null;
  }

  const accountsWithUnscheduled = accountModels.filter(
    (account) => (account.reconciliation.unscheduledRemainderMinor ?? 0) > 0,
  ).length;
  const overallocatedAccounts = accountModels.filter(
    (account) => (account.reconciliation.overallocatedAmountMinor ?? 0) > 0,
  ).length;

  let futureTimedEventCount = 0;
  let ambiguousEventCount = 0;
  for (const event of input.events) {
    const position = classifyExpectedEventTemporalPosition(input.actualsThroughDateIso, {
      expectedAmountMinor: event.expectedAmountMinor,
      timingPrecision: event.timingPrecision,
      expectedDateIso: event.expectedDateIso,
      expectedMonthStartIso: event.expectedMonthStartIso,
      rangeStartDateIso: event.rangeStartDateIso,
      rangeEndDateIso: event.rangeEndDateIso,
    });
    if (position === "FUTURE_TIMED") futureTimedEventCount += 1;
    if (position === "AMBIGUOUS_AT_CUTOFF") ambiguousEventCount += 1;
  }

  return {
    financeYearId: input.financeYearId,
    actualsThroughDateIso: input.actualsThroughDateIso,
    referenceDateIso: input.actualsThroughDateIso,
    currentForecast: input.currentForecast,
    annual: {
      income,
      expense,
      resultMinor: income.annualForecastMinor - expense.annualForecastMinor,
      futureResultContextMinor:
        income.remainingFutureExpectationMinor - expense.remainingFutureExpectationMinor,
    },
    timingCoverage,
    interpretationState: resolveInterpretationState({ accounts: accountModels, income, expense }),
    exceptions: buildExceptions(accountModels),
    counts: {
      totalExpectedEventCount: input.events.length,
      futureTimedEventCount,
      ambiguousEventCount,
      accountsWithUnscheduledRemainderCount: accountsWithUnscheduled,
      overallocatedAccountCount: overallocatedAccounts,
      accountCount: accountModels.length,
    },
    accounts: accountModels,
    upcomingEvents,
  };
}
