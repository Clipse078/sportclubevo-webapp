import type { PrismaClient } from "@prisma/client";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import {
  canViewFinanceActualMeasures,
  canViewFinanceBudgetMeasures,
  canViewFinanceForecastMeasures,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { buildFinanceForecastTimingVisualModel } from "@/lib/finance/forecast/build-forecast-timing-visual-model";
import { buildFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/reporting/build-finance-overview-decision-intelligence-read-model";
import type { FinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/reporting/finance-overview-decision-intelligence-read-model";
import { listFinanceExpectedFinancialEvents } from "@/lib/finance/services/finance-expected-financial-event-service";
import {
  loadFinanceManagementOverviewReadModel,
  type LoadFinanceManagementReportingInput,
} from "@/lib/finance/services/finance-management-reporting-query-service";
import { loadFinanceForecastTimingOverview } from "@/lib/finance/services/finance-forecast-timing-query-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeConfiguration"
  | "financeBudget"
  | "financeActualEntry"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financialReportingGroup"
  | "financialAccount"
  | "financeExpectedFinancialEvent"
  | "$transaction"
>;

export type LoadFinanceOverviewDecisionIntelligenceInput = LoadFinanceManagementReportingInput & {
  forecastingCapabilityEnabled: boolean;
  reportingCapabilityEnabled: boolean;
  canBudgetManage: boolean;
  canStructure: boolean;
};

/** FIN-05D — bounded composition (management read + optional timing bundle). */
export const FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE = {
  reusesManagementOverviewLoader: true,
  timingOverviewWhenForecastVisible: 1,
  expectedEventsWhenForecastVisible: 1,
  perAccountQueryLoopForbidden: true,
} as const;

export async function loadFinanceOverviewDecisionIntelligenceReadModel(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceOverviewDecisionIntelligenceInput,
): Promise<FinanceOverviewDecisionIntelligenceReadModel> {
  const management = await loadFinanceManagementOverviewReadModel(db, ctx, {
    financeYearId: input.financeYearId,
    actualGrain: input.actualGrain,
    actualYtdCutoffDate: input.actualYtdCutoffDate,
  });

  const timingVisible =
    input.forecastingCapabilityEnabled && canViewFinanceForecastMeasures(ctx);

  let timingOverview = null;
  let visualModel = null;

  if (
    timingVisible &&
    management.availability !== "NO_FINANCE_YEAR" &&
    management.financeYearId
  ) {
    const year = await db.financeYear.findUnique({
      where: { id: management.financeYearId },
      select: { startDate: true, endDate: true },
    });

    try {
      timingOverview = await loadFinanceForecastTimingOverview(db, ctx, {
        financeYearId: management.financeYearId,
      });
      const events = await listFinanceExpectedFinancialEvents(db, ctx, {
        financeYearId: management.financeYearId,
      });
      const accountNameById = new Map(
        timingOverview.accounts.map((account) => [
          account.financialAccountId,
          account.name,
        ]),
      );
      visualModel = buildFinanceForecastTimingVisualModel({
        overview: timingOverview,
        events,
        accountNameById,
        financeYearStartDateIso: year?.startDate
          ? formatFinanceCalendarDateIso(year.startDate)
          : null,
        financeYearEndDateIso: year?.endDate
          ? formatFinanceCalendarDateIso(year.endDate)
          : null,
      });
    } catch {
      timingOverview = null;
      visualModel = null;
    }
  }

  const permissionKeys = ctx.permissionKeys;
  const canOpenReports =
    input.reportingCapabilityEnabled &&
    (permissionKeys.has(PERMISSIONS.FINANCE_VIEW) ||
      canViewFinanceBudgetMeasures(ctx) ||
      canViewFinanceActualMeasures(ctx) ||
      canViewFinanceForecastMeasures(ctx));

  return buildFinanceOverviewDecisionIntelligenceReadModel({
    management,
    timingOverview,
    visualModel,
    timingVisible,
    capabilities: {
      canOpenReports,
      canOpenBudget: canViewFinanceBudgetMeasures(ctx),
      canOpenForecast: canViewFinanceForecastMeasures(ctx),
      canOpenTiming: timingVisible,
      canOpenActuals: canViewFinanceActualMeasures(ctx),
      canOpenStructure: input.canStructure,
    },
  });
}
