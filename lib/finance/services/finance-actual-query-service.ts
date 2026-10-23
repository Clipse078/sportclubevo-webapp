import type { PrismaClient } from "@prisma/client";
import { buildActualVarianceReadModel } from "@/lib/finance/actual/actual-variance-read-model";
import {
  isEffectiveDateOnOrBeforeYtdCutoff,
  isEffectiveDateWithinMeasurementPeriod,
  resolveFinanceMeasurementPeriod,
  type FinanceMeasurementMode,
  type FinanceMeasurementPeriod,
} from "@/lib/finance/actual/finance-measurement-period";
import {
  deriveManagementReviewSignals,
  type ManagementReviewSignal,
} from "@/lib/finance/actual/management-review-signals";
import type { BudgetComparisonMode } from "@/lib/finance/actual/period-semantics";
import {
  isEffectiveDateOnOrBeforeCutoff,
} from "@/lib/finance/actual/period-semantics";
import { buildPeriodicActualReadModel } from "@/lib/finance/actual/periodic-account-read-model";
import {
  buildFinanceMonthSlicerOptions,
  buildFinanceQuarterSlicerOptions,
} from "@/lib/finance/actual/finance-measurement-period-slicer";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import { requireFinanceActualView, type FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { listFinancialAccounts } from "@/lib/finance/services/financial-account-service";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeConfiguration"
  | "financeBudget"
  | "financeActualEntry"
  | "financialAccount"
  | "financialReportingGroup"
>;

export type ActualsWorkspaceEntry = {
  id: string;
  effectiveDate: Date;
  amountMinor: number;
  currency: string;
  description: string | null;
  source: string;
  account: {
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  };
};

export type ActualsWorkspaceSnapshot = {
  selectedYearId: string | null;
  comparisonMode: BudgetComparisonMode;
  measurementPeriod: FinanceMeasurementPeriod | null;
  periodSlicer: {
    months: ReturnType<typeof buildFinanceMonthSlicerOptions>;
    quarters: ReturnType<typeof buildFinanceQuarterSlicerOptions>;
  } | null;
  ytdCutoffDate: Date | null;
  baseCurrency: string | null;
  entries: ActualsWorkspaceEntry[];
  variance: ReturnType<typeof buildActualVarianceReadModel>;
  periodic: ReturnType<typeof buildPeriodicActualReadModel> | null;
  managementSignals: ManagementReviewSignal[];
  selectableAccounts: Array<{
    id: string;
    name: string;
    canonicalSemantic: "INCOME" | "EXPENSE";
  }>;
};

function toEntryRows(
  entries: ReadonlyArray<{
    financialAccountId: string;
    amountMinor: number;
    financialAccount: { canonicalSemantic: string };
  }>,
) {
  return entries.map((entry) => ({
    financialAccountId: entry.financialAccountId,
    canonicalSemantic: entry.financialAccount.canonicalSemantic as "INCOME" | "EXPENSE",
    amountMinor: entry.amountMinor,
  }));
}

export async function loadActualsWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    requestedYearId: string | null;
    comparisonMode?: BudgetComparisonMode;
    measurementMode?: FinanceMeasurementMode;
    requestedPeriodIndex?: number | null;
    requestedPeriodStartIndex?: number | null;
    requestedPeriodEndIndex?: number | null;
    referenceDate?: Date;
    formattingLocale?: string;
  },
): Promise<{
  years: Array<{ id: string; name: string }>;
  snapshot: ActualsWorkspaceSnapshot;
}> {
  requireFinanceActualView(ctx);

  const measurementMode: FinanceMeasurementMode =
    input.measurementMode ?? input.comparisonMode ?? "FULL_YEAR";

  const comparisonMode: BudgetComparisonMode = measurementMode;

  const [config, years] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { baseCurrency: true, currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        tenantId: true,
        status: true,
      },
    }),
  ]);

  const baseCurrency = config?.baseCurrency?.trim().toUpperCase() ?? null;
  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: input.requestedYearId,
    years,
    currentFinanceYearId: config?.currentFinanceYearId ?? null,
  });

  const emptyVariance = buildActualVarianceReadModel({
    tenantId: ctx.tenantId,
    financeYearId: selectedYearId ?? "",
    financeYearName: "",
    baseCurrency,
    comparisonMode,
    ytdCutoffDate: null,
    approvedMeasure: null,
    accounts: [],
    actualEntries: [],
  });

  if (!selectedYearId || !baseCurrency) {
    return {
      years: years.map((y) => ({ id: y.id, name: y.name })),
      snapshot: {
        selectedYearId,
        comparisonMode,
        measurementPeriod: null,
        periodSlicer: null,
        ytdCutoffDate: null,
        baseCurrency,
        entries: [],
        variance: {
          ...emptyVariance,
          availability: baseCurrency ? "NO_FINANCE_YEAR" : "NO_BASE_CURRENCY",
        },
        periodic: null,
        managementSignals: [],
        selectableAccounts: [],
      },
    };
  }

  const year = years.find((y) => y.id === selectedYearId)!;
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const yearPeriod = { startDate: year.startDate, endDate: year.endDate };
  const formattingLocale = input.formattingLocale ?? "de-CH";

  const measurementPeriod = resolveFinanceMeasurementPeriod({
    financeYearId: selectedYearId,
    financeYearName: year.name,
    year: yearPeriod,
    mode: measurementMode,
    requestedPeriodIndex: input.requestedPeriodIndex,
    requestedPeriodStartIndex: input.requestedPeriodStartIndex,
    requestedPeriodEndIndex: input.requestedPeriodEndIndex,
    referenceDate: input.referenceDate,
    locale: formattingLocale,
  });

  const periodSlicer = {
    months: buildFinanceMonthSlicerOptions(yearPeriod, formattingLocale),
    quarters: buildFinanceQuarterSlicerOptions(yearPeriod, formattingLocale),
  };

  const accounts = (await listFinancialAccounts(db, ctx)).filter(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );

  if (accounts.length === 0) {
    return {
      years: years.map((y) => ({ id: y.id, name: y.name })),
      snapshot: {
        selectedYearId,
        comparisonMode,
        measurementPeriod,
        periodSlicer,
        ytdCutoffDate:
          measurementMode === "YTD" ? measurementPeriod.ytdCutoffDate : null,
        baseCurrency,
        entries: [],
        variance: {
          ...emptyVariance,
          financeYearId: selectedYearId,
          financeYearName: year.name,
          availability: "NO_STRUCTURE",
        },
        periodic: null,
        managementSignals: [],
        selectableAccounts: [],
      },
    };
  }

  const ytdCutoffDate =
    measurementMode === "YTD" || measurementMode === "MONTH" || measurementMode === "QUARTER"
      ? measurementPeriod.ytdCutoffDate
      : null;

  const rawEntries = await db.financeActualEntry.findMany({
    where: { tenantId: ctx.tenantId, financeYearId: selectedYearId },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    include: {
      financialAccount: {
        select: {
          id: true,
          name: true,
          canonicalSemantic: true,
          lifecycle: true,
        },
      },
    },
  });

  const fullYearEntries = rawEntries;

  const ytdEntries = rawEntries.filter((entry) =>
    isEffectiveDateOnOrBeforeYtdCutoff(entry.effectiveDate, measurementPeriod.ytdCutoffDate),
  );

  const periodEntries = rawEntries.filter((entry) =>
    isEffectiveDateWithinMeasurementPeriod(entry.effectiveDate, measurementPeriod),
  );

  const filteredForLegacyVariance =
    measurementMode === "FULL_YEAR"
      ? fullYearEntries
      : measurementMode === "YTD"
        ? ytdEntries
        : periodEntries;

  const entriesForBookings =
    measurementMode === "FULL_YEAR"
      ? fullYearEntries
      : measurementMode === "YTD"
        ? ytdEntries.filter((entry) =>
            isEffectiveDateOnOrBeforeCutoff(entry.effectiveDate, measurementPeriod.ytdCutoffDate),
          )
        : periodEntries;

  const budget = await db.financeBudget.findUnique({
    where: {
      tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: selectedYearId },
    },
    include: {
      versions: { include: { lines: true } },
    },
  });

  const approvedMeasure = budget
    ? resolveApprovedBudgetMeasure({
        currentBaselineVersionId: budget.currentBaselineVersionId,
        versions: budget.versions,
      })
    : null;

  const accountPayload = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
    lifecycle: a.lifecycle,
  }));

  const periodic = buildPeriodicActualReadModel({
    measurementMode,
    approvedMeasure,
    accounts: accountPayload,
    periodEntries: toEntryRows(periodEntries),
    ytdEntries: toEntryRows(ytdEntries),
    fullYearEntries: toEntryRows(fullYearEntries),
  });

  const managementSignals = deriveManagementReviewSignals({
    accounts: periodic.accounts,
  });

  const variance = buildActualVarianceReadModel({
    tenantId: ctx.tenantId,
    financeYearId: selectedYearId,
    financeYearName: year.name,
    baseCurrency,
    comparisonMode,
    ytdCutoffDate:
      measurementMode === "YTD" ? measurementPeriod.ytdCutoffDate : ytdCutoffDate,
    approvedMeasure,
    accounts: accountPayload,
    actualEntries: toEntryRows(filteredForLegacyVariance),
  });

  return {
    years: years.map((y) => ({ id: y.id, name: y.name })),
    snapshot: {
      selectedYearId,
      comparisonMode,
      measurementPeriod,
      periodSlicer,
      ytdCutoffDate,
      baseCurrency,
      entries: entriesForBookings.map((entry) => ({
        id: entry.id,
        effectiveDate: entry.effectiveDate,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        description: entry.description,
        source: entry.source,
        account: {
          id: entry.financialAccount.id,
          name: entry.financialAccount.name,
          canonicalSemantic: entry.financialAccount.canonicalSemantic as "INCOME" | "EXPENSE",
          lifecycle: entry.financialAccount.lifecycle,
        },
      })),
      variance,
      periodic,
      managementSignals,
      selectableAccounts: accounts
        .filter((a) => a.lifecycle === "ACTIVE")
        .map((a) => ({
          id: a.id,
          name: a.name,
          canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
        })),
    },
  };
}
