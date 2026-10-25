import type { PrismaClient } from "@prisma/client";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import {
  canViewFinanceActualMeasures,
  canViewFinanceBudgetMeasures,
  canViewFinanceForecastMeasures,
  hasFinancePermission,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveActualMeasure } from "@/lib/finance/reporting/actual-measure-provider";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { buildFinanceManagementOverviewReadModel } from "@/lib/finance/reporting/build-finance-management-overview-read-model";
import {
  buildFinanceManagementPnlReadModel,
  emptyFinanceManagementPnlReadModel,
} from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import { buildFinanceVarianceAnalysisReadModel } from "@/lib/finance/reporting/build-finance-variance-analysis-read-model";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";
import type { FinanceVarianceAnalysisReadModel } from "@/lib/finance/reporting/finance-variance-analysis-read-model";
import { resolveCurrentForecastMeasure } from "@/lib/finance/reporting/current-forecast-measure-provider";
import type { FinanceReportingComparisonGrain } from "@/lib/finance/reporting/reporting-comparison-model";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeConfiguration"
  | "financeBudget"
  | "financeActualEntry"
  | "financeForecast"
  | "financialReportingGroup"
  | "financialAccount"
>;

export type LoadFinanceManagementReportingInput = {
  financeYearId: string | null;
  actualGrain?: "ANNUAL_FULL_YEAR" | "YTD";
  actualYtdCutoffDate?: Date | null;
};

type ReportingStructureContext = {
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string;
  groups: Awaited<ReturnType<Db["financialReportingGroup"]["findMany"]>>;
  accounts: Awaited<ReturnType<Db["financialAccount"]["findMany"]>>;
  hasStructure: boolean;
};

async function loadReportingStructureContext(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<
  | { ok: false; partial: Pick<FinanceManagementOverviewReadModel, "availability" | "baseCurrency"> }
  | { ok: true; context: ReportingStructureContext }
> {
  const [config, years, groups, accounts] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { baseCurrency: true, currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: "desc" },
    }),
    db.financialReportingGroup.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.financialAccount.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const baseCurrency = config?.baseCurrency?.trim().toUpperCase() ?? null;
  if (!baseCurrency) {
    return { ok: false, partial: { availability: "NO_BASE_CURRENCY", baseCurrency: null } };
  }

  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: financeYearId,
    years,
    currentFinanceYearId: config?.currentFinanceYearId ?? null,
  });

  if (!selectedYearId) {
    return { ok: false, partial: { availability: "NO_FINANCE_YEAR", baseCurrency } };
  }

  const year = years.find((y) => y.id === selectedYearId)!;
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const hasStructure =
    groups.length > 0 ||
    accounts.some((a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE");

  return {
    ok: true,
    context: {
      financeYearId: selectedYearId,
      financeYearName: year.name,
      baseCurrency,
      groups,
      accounts,
      hasStructure,
    },
  };
}

async function loadCanonicalMeasures(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
  input: LoadFinanceManagementReportingInput,
) {
  const sourceVisibility = {
    approvedBudget: canViewFinanceBudgetMeasures(ctx),
    actual: canViewFinanceActualMeasures(ctx),
    currentForecast: canViewFinanceForecastMeasures(ctx),
  };

  const [budget, forecast, actualEntries] = await Promise.all([
    sourceVisibility.approvedBudget
      ? db.financeBudget.findUnique({
          where: {
            tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId },
          },
          include: { versions: { include: { lines: true } } },
        })
      : Promise.resolve(null),
    sourceVisibility.currentForecast
      ? db.financeForecast.findUnique({
          where: {
            tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId },
          },
          include: { versions: { include: { lines: true } } },
        })
      : Promise.resolve(null),
    sourceVisibility.actual
      ? db.financeActualEntry.findMany({
          where: { tenantId: ctx.tenantId, financeYearId },
          select: {
            financialAccountId: true,
            amountMinor: true,
            effectiveDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const approvedMeasure = budget
    ? resolveApprovedBudgetMeasure({
        currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
        versions: budget.versions,
      })
    : null;

  const forecastMeasure =
    forecast && sourceVisibility.currentForecast
      ? resolveCurrentForecastMeasure({
          forecastId: forecast.id,
          currentVersionId: forecast.currentVersionId,
          versions: forecast.versions.map((v) => ({
            id: v.id,
            status: v.status,
            forecastId: forecast.id,
            lines: v.lines,
          })),
        })
      : null;

  const actualGrain = input.actualGrain ?? "ANNUAL_FULL_YEAR";
  const actualMeasure = sourceVisibility.actual
    ? resolveActualMeasure({
        entries: actualEntries,
        grain: actualGrain,
        ytdCutoffDate: input.actualYtdCutoffDate ?? null,
      })
    : null;

  return {
    sourceVisibility,
    approvedMeasure,
    forecastMeasure,
    actualMeasure,
  };
}

function emptyOverview(
  ctx: FinanceAuthContext,
  partial: Partial<FinanceManagementOverviewReadModel>,
): FinanceManagementOverviewReadModel {
  return {
    tenantId: ctx.tenantId,
    financeYearId: partial.financeYearId ?? "",
    financeYearName: partial.financeYearName ?? "",
    mode: "LIVE",
    baseCurrency: partial.baseCurrency ?? null,
    availability: partial.availability ?? "NO_FINANCE_YEAR",
    actualCutoffDate: null,
    approvedBudget: {
      availability: "NOT_VISIBLE",
      summary: null,
      approvedBudgetVersionId: null,
    },
    actual: { availability: "NOT_VISIBLE", summary: null, grain: null },
    currentForecast: {
      availability: "NOT_VISIBLE",
      summary: null,
      currentForecastVersionId: null,
    },
    forecastVsBudgetVariance: {
      availability: "BOTH_MISSING",
      baselineMinor: null,
      comparisonMinor: null,
      rawDeltaMinor: null,
      variancePercent: null,
      favorability: null,
      absoluteVarianceMagnitudeMinor: null,
    },
    actualVsBudgetVariance: {
      availability: "BOTH_MISSING",
      baselineMinor: null,
      comparisonMinor: null,
      rawDeltaMinor: null,
      variancePercent: null,
      favorability: null,
      absoluteVarianceMagnitudeMinor: null,
    },
    topFavourableDrivers: [],
    topUnfavourableDrivers: [],
    attention: {
      hasUnfavourableManagementResultVariance: false,
      hasMissingApprovedBudget: true,
      hasMissingCurrentForecast: true,
    },
  };
}

export async function loadFinanceManagementOverviewReadModel(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceManagementReportingInput,
): Promise<FinanceManagementOverviewReadModel> {
  requireFinanceReportingAccess(ctx);

  const structure = await loadReportingStructureContext(db, ctx, input.financeYearId);
  if (!structure.ok) {
    return emptyOverview(ctx, structure.partial);
  }

  const { context } = structure;
  if (!context.hasStructure) {
    return emptyOverview(ctx, {
      financeYearId: context.financeYearId,
      financeYearName: context.financeYearName,
      baseCurrency: context.baseCurrency,
      availability: "NO_STRUCTURE",
    });
  }

  const measures = await loadCanonicalMeasures(db, ctx, context.financeYearId, input);

  return buildFinanceManagementOverviewReadModel({
    tenantId: ctx.tenantId,
    financeYearId: context.financeYearId,
    financeYearName: context.financeYearName,
    baseCurrency: context.baseCurrency,
    structureAvailability: "AVAILABLE",
    actualCutoffDate: measures.actualMeasure?.cutoffDate ?? null,
    groups: context.groups,
    accounts: context.accounts,
    approvedMeasure: measures.approvedMeasure,
    actualMeasure: measures.actualMeasure,
    forecastMeasure: measures.forecastMeasure,
    sourceVisibility: measures.sourceVisibility,
  });
}

export async function loadFinanceManagementPnlReadModel(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceManagementReportingInput,
): Promise<FinanceManagementPnlReadModel> {
  requireFinanceReportingAccess(ctx);

  const structure = await loadReportingStructureContext(db, ctx, input.financeYearId);
  if (!structure.ok) {
    return emptyFinanceManagementPnlReadModel({
      tenantId: ctx.tenantId,
      financeYearId: "",
      financeYearName: "",
      baseCurrency: structure.partial.baseCurrency,
      availability:
        structure.partial.availability === "NO_BASE_CURRENCY"
          ? "NO_BASE_CURRENCY"
          : "NO_FINANCE_YEAR",
    });
  }

  const { context } = structure;
  if (!context.hasStructure) {
    return emptyFinanceManagementPnlReadModel({
      tenantId: ctx.tenantId,
      financeYearId: context.financeYearId,
      financeYearName: context.financeYearName,
      baseCurrency: context.baseCurrency,
      availability: "NO_STRUCTURE",
    });
  }

  const measures = await loadCanonicalMeasures(db, ctx, context.financeYearId, input);

  return buildFinanceManagementPnlReadModel({
    tenantId: ctx.tenantId,
    financeYearId: context.financeYearId,
    financeYearName: context.financeYearName,
    baseCurrency: context.baseCurrency,
    structureAvailability: "AVAILABLE",
    actualCutoffDate: measures.actualMeasure?.cutoffDate ?? null,
    groups: context.groups,
    accounts: context.accounts,
    approvedMeasure: measures.approvedMeasure,
    actualMeasure: measures.actualMeasure,
    forecastMeasure: measures.forecastMeasure,
    sourceVisibility: measures.sourceVisibility,
  });
}

export async function loadFinanceVarianceAnalysisReadModel(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceManagementReportingInput & {
    comparison: FinanceVarianceAnalysisReadModel["comparison"];
    grain?: FinanceReportingComparisonGrain;
  },
): Promise<FinanceVarianceAnalysisReadModel> {
  requireFinanceReportingAccess(ctx);

  const structure = await loadReportingStructureContext(db, ctx, input.financeYearId);
  if (!structure.ok) {
    return {
      tenantId: ctx.tenantId,
      financeYearId: "",
      financeYearName: "",
      mode: "LIVE",
      comparison: input.comparison,
      grain: input.grain ?? "ANNUAL_FULL_YEAR",
      baseCurrency: structure.partial.baseCurrency,
      availability: structure.partial.availability === "NO_BASE_CURRENCY"
        ? "NO_BASE_CURRENCY"
        : "NO_FINANCE_YEAR",
      actualCutoffDate: null,
      approvedBudgetVersionId: null,
      currentForecastVersionId: null,
      baselineSummary: null,
      comparisonSummary: null,
      managementResultComparison: {
        availability: "BOTH_MISSING",
        baselineMinor: null,
        comparisonMinor: null,
        rawDeltaMinor: null,
        variancePercent: null,
        favorability: null,
        absoluteVarianceMagnitudeMinor: null,
      },
      tree: [],
      topFavourableDrivers: [],
      topUnfavourableDrivers: [],
      sourceVisibility: {
        approvedBudget: canViewFinanceBudgetMeasures(ctx),
        actual: canViewFinanceActualMeasures(ctx),
        currentForecast: canViewFinanceForecastMeasures(ctx),
      },
    };
  }

  const { context } = structure;
  const measures = await loadCanonicalMeasures(db, ctx, context.financeYearId, input);

  const model = buildFinanceVarianceAnalysisReadModel({
    tenantId: ctx.tenantId,
    financeYearId: context.financeYearId,
    financeYearName: context.financeYearName,
    baseCurrency: context.baseCurrency,
    comparison: input.comparison,
    grain: input.grain ?? "ANNUAL_FULL_YEAR",
    actualCutoffDate: measures.actualMeasure?.cutoffDate ?? null,
    groups: context.groups,
    accounts: context.accounts,
    approvedMeasure: measures.approvedMeasure,
    actualMeasure: measures.actualMeasure,
    forecastMeasure: measures.forecastMeasure,
    sourceVisibility: measures.sourceVisibility,
  });

  if (!context.hasStructure) {
    return { ...model, availability: "NO_STRUCTURE", tree: [] };
  }

  return model;
}

/** FIN-05B query-shape guard — bounded loads per request (no per-row queries). */
export const FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE = {
  structureLoads: 4,
  measureLoads: 3,
  perAccountQueryLoopForbidden: true,
} as const;

function requireFinanceReportingAccess(ctx: FinanceAuthContext): void {
  if (
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    !canViewFinanceBudgetMeasures(ctx) &&
    !canViewFinanceActualMeasures(ctx) &&
    !canViewFinanceForecastMeasures(ctx)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view finance reporting.",
      403,
    );
  }
}
