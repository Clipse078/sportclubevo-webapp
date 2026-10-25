import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import type { FinanceScenarioCalculationResult } from "@/lib/finance/forecast/finance-scenario-calculation-types";
import type {
  FinanceScenarioAssumptionTemporalReadModel,
  FinanceScenarioTemporalSummary,
} from "@/lib/finance/forecast/merge-effective-dated-scenario-calculation";
import type { ForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import type { FinanceForecastAccountComparisonRow } from "@/lib/finance/forecast/forecast-revision-comparison";

export const FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT = 5;

/** FIN-04D-04 architecture anchor (query / read layer). */
export const FINANCE_SCENARIO_FIN_04D_04_QUERY = {
  listQueryService: "loadFinanceScenarioList",
  detailQueryService: "loadFinanceScenarioDetail",
  scenarioToScenarioComparisonV1: "DEFERRED",
  topDriversDefaultLimit: FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT,
  listDefaultActiveOnly: true,
  primaryComparison: "SCENARIO_VS_FROZEN_BASELINE",
  liveCurrentForecastComparisonSecondary: true,
  approvedBudgetComparisonSecondary: true,
  automaticForecastComparisonDefault: false,
  deltaFormulaComparisonMinusBase: true,
} as const;

export type FinanceScenarioActorRef = {
  userId: string;
  displayName: string;
};

export type FinanceScenarioBaselineFreshness =
  | {
      status: "CURRENT";
      sourceForecastVersionId: string;
      currentForecastVersionId: string;
    }
  | {
      status: "OUTDATED";
      sourceForecastVersionId: string;
      currentForecastVersionId: string;
    }
  | {
      status: "CURRENT_FORECAST_UNAVAILABLE";
      sourceForecastVersionId: string;
      currentForecastVersionId: null;
    };

export type FinanceScenarioSourceForecastRef = {
  forecastId: string;
  forecastVersionId: string;
  versionNumber: number;
  revisionLabel: string | null;
  asOfDate: string | null;
  actualsThroughDate: string | null;
  presentation: ForecastHistoryDisplayMetadata;
};

export type FinanceScenarioCurrentForecastContext =
  | {
      kind: "UNAVAILABLE";
    }
  | {
      kind: "AVAILABLE";
      forecastId: string;
      forecastVersionId: string;
      versionNumber: number;
      revisionLabel: string | null;
      asOfDate: string | null;
      actualsThroughDate: string | null;
      presentation: ForecastHistoryDisplayMetadata;
      resultMinor: number;
      incomeMinor: number;
      expenseMinor: number;
    };

export type FinanceScenarioPrimaryComparison = {
  baselineResultMinor: number;
  scenarioResultMinor: number;
  resultDeltaMinor: number;
  baselineIncomeMinor: number;
  scenarioIncomeMinor: number;
  incomeDeltaMinor: number;
  baselineExpenseMinor: number;
  scenarioExpenseMinor: number;
  expenseDeltaMinor: number;
};

export type FinanceScenarioLiveCurrentForecastComparison =
  | {
      kind: "UNAVAILABLE";
      reason: "NO_CURRENT_FORECAST";
    }
  | {
      kind: "AVAILABLE";
      currentForecastVersionId: string;
      currentForecastResultMinor: number;
      currentForecastIncomeMinor: number;
      currentForecastExpenseMinor: number;
      scenarioVsCurrentResultDeltaMinor: number;
      scenarioVsCurrentIncomeDeltaMinor: number;
      scenarioVsCurrentExpenseDeltaMinor: number;
      accountComparisons: FinanceScenarioAccountLiveComparison[];
    };

export type FinanceScenarioAccountLiveComparison = FinanceForecastAccountComparisonRow & {
  scenarioAmountMinor: number;
  currentForecastAmountMinor: number | null;
  currentForecastLinePresent: boolean;
};

export type FinanceScenarioApprovedBudgetComparison =
  | {
      kind: "NO_APPROVED_BUDGET";
    }
  | {
      kind: "AVAILABLE";
      approvedBudgetVersionId: string;
      approvedBudgetVersionNumber: number;
      approvedBudgetResultMinor: number;
      approvedBudgetIncomeMinor: number;
      approvedBudgetExpenseMinor: number;
      scenarioVsApprovedBudgetResultDeltaMinor: number;
      scenarioVsApprovedBudgetIncomeDeltaMinor: number;
      scenarioVsApprovedBudgetExpenseDeltaMinor: number;
    };

export type FinanceScenarioAssumptionReadModel = {
  assumptionId: string;
  financialAccountId: string;
  kind: ScenarioAssumptionKindV1;
  percentBasisPoints: number | null;
  amountMinorDelta: number | null;
  absoluteAmountMinor: number | null;
  effectiveFromDateIso: string | null;
  note: string | null;
};

export type FinanceScenarioTemporalSummaryReadModel = Omit<
  FinanceScenarioTemporalSummary,
  "assumptionTemporalByAccountId"
> & {
  assumptionTemporal: FinanceScenarioAssumptionTemporalReadModel[];
};

export type FinanceScenarioAccountPresentation = {
  financialAccountId: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  code: string | null;
  lifecycle: "ACTIVE" | "ARCHIVED";
};

export type FinanceScenarioDriver = {
  financialAccountId: string;
  account: FinanceScenarioAccountPresentation;
  assumptionKind: ScenarioAssumptionKindV1;
  baselineAmountMinor: number;
  scenarioAmountMinor: number;
  accountDeltaMinor: number;
  resultContributionMinor: number;
  absoluteResultContributionMinor: number;
};

export type FinanceScenarioAccountEffect = {
  financialAccountId: string;
  account: FinanceScenarioAccountPresentation;
  accountType: "INCOME" | "EXPENSE";
  baselineAmountMinor: number;
  scenarioAmountMinor: number;
  deltaMinor: number;
  assumptionKind: ScenarioAssumptionKindV1 | null;
  assumptionApplied: boolean;
  resultContributionMinor: number;
};

export type FinanceScenarioResultSummaryState =
  | "NO_ASSUMPTIONS"
  | "NO_RESULT_CHANGE"
  | "RESULT_CHANGED";

export type FinanceScenarioChangeFlags = {
  hasResultChange: boolean;
  hasIncomeChange: boolean;
  hasExpenseChange: boolean;
  hasAccountChanges: boolean;
  hasCompositionChange: boolean;
};

export type FinanceScenarioComparisonReadModel = {
  primary: FinanceScenarioPrimaryComparison;
  baselineFreshness: FinanceScenarioBaselineFreshness;
  sourceForecast: FinanceScenarioSourceForecastRef;
  currentForecast: FinanceScenarioCurrentForecastContext;
  liveCurrentForecast: FinanceScenarioLiveCurrentForecastComparison;
  approvedBudget: FinanceScenarioApprovedBudgetComparison;
  summaryState: FinanceScenarioResultSummaryState;
  changeFlags: FinanceScenarioChangeFlags;
};

export type FinanceScenarioListItemReadModel = {
  scenarioId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: FinanceScenarioActorRef | null;
  updatedBy: FinanceScenarioActorRef | null;
  sourceForecastVersionId: string;
  baselineAsOfDate: string | null;
  baselineActualsThroughDate: string | null;
  baselineFreshness: FinanceScenarioBaselineFreshness;
  assumptionCount: number;
  baselineResultMinor: number;
  scenarioResultMinor: number;
  resultDeltaMinor: number;
  summaryState: FinanceScenarioResultSummaryState;
};

export type FinanceScenarioListReadModel = {
  financeYearId: string;
  items: FinanceScenarioListItemReadModel[];
};

export type FinanceScenarioGovernanceReadModel = {
  hasAdoptionProvenance: boolean;
  canDelete: boolean;
  canAdoptToCurrentForecast: boolean;
  adoptBlockedReason: "NONE" | "ARCHIVED" | "NO_CURRENT_FORECAST" | "PARTIAL_TEMPORAL_COVERAGE" | "TEMPORAL_STALE";
  canUpdateSourceForecast: boolean;
  currentForecastVersionIdForActions: string | null;
};

export type FinanceScenarioDetailReadModel = {
  scenarioId: string;
  financeYearId: string;
  tenantId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: FinanceScenarioActorRef | null;
  updatedBy: FinanceScenarioActorRef | null;
  assumptions: FinanceScenarioAssumptionReadModel[];
  assumptionCount: number;
  calculation: FinanceScenarioCalculationResult;
  temporal: FinanceScenarioTemporalSummaryReadModel;
  comparison: FinanceScenarioComparisonReadModel;
  governance: FinanceScenarioGovernanceReadModel;
  topDrivers: FinanceScenarioDriver[];
  allDrivers: FinanceScenarioDriver[];
  accountEffects: FinanceScenarioAccountEffect[];
};
