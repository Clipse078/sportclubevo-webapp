import type { PrismaClient } from "@prisma/client";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { resolveActualVersusAnnualForecastPresentation } from "@/lib/finance/forecast/actual-forecast-policy";
import {
  detectForecastHistoryLineageDiagnostics,
  isCanonicalManagementForecastVersion,
  resolvePreviousForecastVersionId,
  type ForecastHistoryLineageVersion,
} from "@/lib/finance/forecast/forecast-history-lineage";
import {
  sortForecastHistoryChronological,
  sortForecastHistoryForDisplay,
} from "@/lib/finance/forecast/forecast-history-ordering";
import type {
  CurrentForecastVsApprovedBudgetResult,
  CurrentForecastVsPreviousResult,
  FinanceForecastHistoryEntry,
  FinanceForecastHistoryReadModel,
  FinanceForecastVersionComparison,
  FinanceForecastVersionRevisionRef,
  ForecastActualComparisonBoundary,
} from "@/lib/finance/forecast/forecast-history-read-model";
import { buildForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import {
  computeFinanceForecastAccountComparisons,
  computeFinanceForecastVersionComparisonSummary,
  sortForecastAccountComparisonsByLargestChange,
  type ForecastVersionLineInput,
} from "@/lib/finance/forecast/forecast-revision-comparison";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import { resolveCanonicalCurrentForecastVersionByPointer } from "@/lib/finance/services/finance-forecast-service";
import { resolveTenantBudgetCurrency } from "@/lib/finance/services/finance-budget-service";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financialAccount"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeConfiguration"
  | "user"
  | "$transaction"
>;

const PLANNING_SEMANTICS = ["INCOME", "EXPENSE"] as const;

function formatActorDisplayName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

type RawForecastVersionRow = {
  id: string;
  forecastId: string;
  status: "CURRENT" | "SUPERSEDED";
  versionNumber: number;
  scenarioKey: string | null;
  revisionSource: string | null;
  revisionLabel: string | null;
  asOfDate: Date | null;
  actualsThroughDate: Date | null;
  previousVersionId: string | null;
  sourceProjectionVersionId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

type LoadedForecastBundle = {
  forecastId: string;
  financeYearId: string;
  currentVersionId: string | null;
  versions: ForecastHistoryLineageVersion[];
  rawVersions: RawForecastVersionRow[];
  linesByVersionId: Map<string, ForecastVersionLineInput[]>;
  accountMeta: Map<
    string,
    { name: string; accountType: "INCOME" | "EXPENSE"; sortOrder: number }
  >;
  accountOrder: string[];
  actorsByUserId: Map<string, { userId: string; displayName: string }>;
};

/**
 * Bounded query shape (no N+1):
 * forecast container → all canonical versions → batched lines → accounts → optional actors.
 */
async function loadForecastHistoryBundle(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<LoadedForecastBundle | null> {
  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true, financeYearId: true, tenantId: true },
  });
  if (!forecast) {
    return null;
  }
  assertSameTenant(forecast.tenantId, ctx.tenantId, "Forecast");

  const rawVersions = await db.financeForecastVersion.findMany({
    where: { forecastId: forecast.id },
    orderBy: { versionNumber: "asc" },
    select: {
      id: true,
      forecastId: true,
      status: true,
      versionNumber: true,
      scenarioKey: true,
      revisionSource: true,
      revisionLabel: true,
      asOfDate: true,
      actualsThroughDate: true,
      previousVersionId: true,
      sourceProjectionVersionId: true,
      createdByUserId: true,
      createdAt: true,
    },
  });

  const canonicalRaw = rawVersions.filter((row) => isCanonicalManagementForecastVersion(row));

  const versions: ForecastHistoryLineageVersion[] = canonicalRaw.map((row) => ({
    forecastVersionId: row.id,
    forecastId: row.forecastId,
    versionNumber: row.versionNumber,
    status: row.status,
    previousVersionId: row.previousVersionId,
    scenarioKey: row.scenarioKey,
  }));

  const versionIds = versions.map((row) => row.forecastVersionId);
  const allLines =
    versionIds.length === 0
      ? []
      : await db.financeForecastLine.findMany({
          where: { forecastVersionId: { in: versionIds } },
          select: { forecastVersionId: true, financialAccountId: true, amountMinor: true },
        });

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      canonicalSemantic: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const accountMeta = new Map<
    string,
    { name: string; accountType: "INCOME" | "EXPENSE"; sortOrder: number }
  >();
  const accountTypes = new Map<string, "INCOME" | "EXPENSE">();
  const accountOrder: string[] = [];
  for (const account of accounts) {
    if (!(PLANNING_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)) {
      continue;
    }
    const accountType = account.canonicalSemantic as "INCOME" | "EXPENSE";
    accountMeta.set(account.id, {
      name: account.name,
      accountType,
      sortOrder: account.sortOrder,
    });
    accountTypes.set(account.id, accountType);
    accountOrder.push(account.id);
  }

  const linesByVersionId = new Map<string, ForecastVersionLineInput[]>();
  for (const line of allLines) {
    const accountType = accountTypes.get(line.financialAccountId);
    if (!accountType) continue;
    const bucket = linesByVersionId.get(line.forecastVersionId) ?? [];
    bucket.push({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
      accountType,
    });
    linesByVersionId.set(line.forecastVersionId, bucket);
  }

  const actorIds = [
    ...new Set(
      canonicalRaw.map((row) => row.createdByUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const actorsByUserId = new Map<string, { userId: string; displayName: string }>();
  if (actorIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: actorIds }, tenantId: ctx.tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    for (const user of users) {
      actorsByUserId.set(user.id, {
        userId: user.id,
        displayName: formatActorDisplayName(user),
      });
    }
  }

  return {
    forecastId: forecast.id,
    financeYearId: forecast.financeYearId,
    currentVersionId: forecast.currentVersionId,
    versions,
    rawVersions: canonicalRaw,
    linesByVersionId,
    accountMeta,
    accountOrder,
    actorsByUserId,
  };
}

function buildHistoryEntry(
  row: {
    id: string;
    versionNumber: number;
    status: "CURRENT" | "SUPERSEDED";
    revisionSource: string | null;
    revisionLabel: string | null;
    asOfDate: Date | null;
    actualsThroughDate: Date | null;
    previousVersionId: string | null;
    sourceProjectionVersionId: string | null;
    createdByUserId: string | null;
    createdAt: Date;
  },
  bundle: LoadedForecastBundle,
  isCurrent: boolean,
): FinanceForecastHistoryEntry {
  const lines = bundle.linesByVersionId.get(row.id) ?? [];
  const summary = computeFinanceForecastVersionComparisonSummary({
    baseLines: lines,
    comparisonLines: lines,
  });
  const presentation = buildForecastHistoryDisplayMetadata({
    revisionLabel: row.revisionLabel,
    revisionSource: row.revisionSource,
    asOfDate: row.asOfDate,
    versionNumber: row.versionNumber,
    isCurrent,
  });

  return {
    forecastVersionId: row.id,
    versionNumber: row.versionNumber,
    status: row.status,
    isCurrent,
    isHistorical: !isCurrent,
    revisionSource: (row.revisionSource as ForecastRevisionSource | null) ?? null,
    revisionLabel: row.revisionLabel,
    asOfDate: row.asOfDate ? formatFinanceCalendarDateIso(row.asOfDate) : null,
    actualsThroughDate: row.actualsThroughDate
      ? formatFinanceCalendarDateIso(row.actualsThroughDate)
      : null,
    createdAt: row.createdAt.toISOString(),
    createdByUserId: row.createdByUserId,
    actor: row.createdByUserId
      ? (bundle.actorsByUserId.get(row.createdByUserId) ?? null)
      : null,
    previousVersionId: row.previousVersionId,
    sourceProjectionVersionId: row.sourceProjectionVersionId,
    lineCount: lines.length,
    totalIncomeMinor: summary.baseIncomeMinor,
    totalExpenseMinor: summary.baseExpenseMinor,
    resultMinor: summary.baseResultMinor,
    presentation,
  };
}

export async function loadFinanceForecastHistory(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<FinanceForecastHistoryReadModel | null> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const bundle = await loadForecastHistoryBundle(db, ctx, financeYearId);
  if (!bundle) {
    return null;
  }

  const currencyCode = await resolveTenantBudgetCurrency(db, ctx);

  const entries = bundle.rawVersions.map((raw) => {
    const isCurrent = bundle.currentVersionId === raw.id;
    return buildHistoryEntry(raw, bundle, isCurrent);
  });

  return {
    financeYearId,
    forecastId: bundle.forecastId,
    currencyCode,
    currentForecastVersionId: bundle.currentVersionId,
    entries: sortForecastHistoryForDisplay(
      entries.map((entry) => ({
        ...entry,
        forecastVersionId: entry.forecastVersionId,
      })),
    ),
    entriesChronological: sortForecastHistoryChronological(entries),
    lineageDiagnostics: detectForecastHistoryLineageDiagnostics(bundle.versions),
  };
}

function buildRevisionRef(
  version: {
    forecastVersionId: string;
    versionNumber: number;
    status: "CURRENT" | "SUPERSEDED";
    revisionLabel: string | null;
    revisionSource: string | null;
    asOfDate: Date | null;
  },
  isCurrent: boolean,
): FinanceForecastVersionRevisionRef {
  const presentation = buildForecastHistoryDisplayMetadata({
    revisionLabel: version.revisionLabel,
    revisionSource: version.revisionSource,
    asOfDate: version.asOfDate,
    versionNumber: version.versionNumber,
    isCurrent,
  });
  return {
    kind: "FORECAST_VERSION",
    forecastVersionId: version.forecastVersionId,
    versionNumber: version.versionNumber,
    status: version.status,
    revisionLabel: version.revisionLabel,
    asOfDate: version.asOfDate ? formatFinanceCalendarDateIso(version.asOfDate) : null,
    presentation,
  };
}

async function loadVersionForComparisonOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
  forecastVersionId: string,
  bundle: LoadedForecastBundle,
) {
  const version = await db.financeForecastVersion.findUnique({
    where: { id: forecastVersionId },
    include: { forecast: { select: { id: true, tenantId: true, financeYearId: true } } },
  });
  if (!version || !isCanonicalManagementForecastVersion(version)) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast version not found.", 404);
  }
  assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");
  if (version.forecast.id !== bundle.forecastId) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast version not found.", 404);
  }
  if (version.forecast.financeYearId !== financeYearId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_HISTORY_INVALID_COMPARISON",
      "Forecast versions cannot be compared across financial years.",
    );
  }
  return version;
}

function lineMapFromInputs(lines: readonly ForecastVersionLineInput[]): Map<string, number> {
  return new Map(lines.map((line) => [line.financialAccountId, line.amountMinor]));
}

function enrichAccountRows<
  T extends { financialAccountId: string; accountType: "INCOME" | "EXPENSE" },
>(
  rows: T[],
  accountMeta: Map<string, { name: string; accountType: "INCOME" | "EXPENSE" }>,
): Array<T & { accountName: string }> {
  return rows.map((row) => ({
    ...row,
    accountName: accountMeta.get(row.financialAccountId)?.name ?? row.financialAccountId,
  }));
}

export async function compareFinanceForecastVersions(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    baseVersionId: string;
    comparisonVersionId: string;
  },
): Promise<FinanceForecastVersionComparison> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  if (input.baseVersionId === input.comparisonVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_HISTORY_INVALID_COMPARISON",
      "Forecast version comparison requires two distinct versions.",
    );
  }

  const bundle = await loadForecastHistoryBundle(db, ctx, input.financeYearId);
  if (!bundle) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast not found for financial year.", 404);
  }

  const baseVersion = await loadVersionForComparisonOrThrow(
    db,
    ctx,
    input.financeYearId,
    input.baseVersionId,
    bundle,
  );
  const comparisonVersion = await loadVersionForComparisonOrThrow(
    db,
    ctx,
    input.financeYearId,
    input.comparisonVersionId,
    bundle,
  );

  const baseLines = bundle.linesByVersionId.get(baseVersion.id) ?? [];
  const comparisonLines = bundle.linesByVersionId.get(comparisonVersion.id) ?? [];

  const summary = computeFinanceForecastVersionComparisonSummary({ baseLines, comparisonLines });
  const accountChanges = computeFinanceForecastAccountComparisons({
    baseLines: lineMapFromInputs(baseLines),
    comparisonLines: lineMapFromInputs(comparisonLines),
    accountTypes: new Map(
      [...bundle.accountMeta.entries()].map(([id, meta]) => [id, meta.accountType]),
    ),
    accountOrder: bundle.accountOrder,
  });
  const largestChanges = sortForecastAccountComparisonsByLargestChange(
    accountChanges,
    bundle.accountOrder,
  );

  const currencyCode = await resolveTenantBudgetCurrency(db, ctx);

  return {
    financeYearId: input.financeYearId,
    currencyCode,
    base: buildRevisionRef(
      {
        forecastVersionId: baseVersion.id,
        versionNumber: baseVersion.versionNumber,
        status: baseVersion.status,
        revisionLabel: baseVersion.revisionLabel,
        revisionSource: baseVersion.revisionSource,
        asOfDate: baseVersion.asOfDate,
      },
      bundle.currentVersionId === baseVersion.id,
    ),
    comparison: buildRevisionRef(
      {
        forecastVersionId: comparisonVersion.id,
        versionNumber: comparisonVersion.versionNumber,
        status: comparisonVersion.status,
        revisionLabel: comparisonVersion.revisionLabel,
        revisionSource: comparisonVersion.revisionSource,
        asOfDate: comparisonVersion.asOfDate,
      },
      bundle.currentVersionId === comparisonVersion.id,
    ),
    summary,
    accountChanges: enrichAccountRows(accountChanges, bundle.accountMeta),
    largestChanges: enrichAccountRows(largestChanges, bundle.accountMeta),
  };
}

export async function getCurrentForecastVsPrevious(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<CurrentForecastVsPreviousResult> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const bundle = await loadForecastHistoryBundle(db, ctx, financeYearId);
  if (!bundle?.currentVersionId) {
    return { kind: "NO_PREVIOUS_FORECAST" };
  }

  const currentRow = bundle.versions.find((row) => row.forecastVersionId === bundle.currentVersionId);
  if (!currentRow) {
    return { kind: "NO_PREVIOUS_FORECAST" };
  }

  const previousVersionId = resolvePreviousForecastVersionId(currentRow, bundle.versions);
  if (!previousVersionId) {
    return { kind: "NO_PREVIOUS_FORECAST" };
  }

  const comparison = await compareFinanceForecastVersions(db, ctx, {
    financeYearId,
    baseVersionId: previousVersionId,
    comparisonVersionId: bundle.currentVersionId,
  });

  return { kind: "COMPARISON", comparison };
}

async function loadGovernanceApprovedBudgetBaseline(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  const budget = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: { versions: { select: { id: true, status: true, versionNumber: true } } },
  });
  if (!budget) {
    return null;
  }
  const baselineRef = resolveCurrentGovernanceBaselineVersion({
    currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
    versions: budget.versions,
  });
  if (!baselineRef) {
    return null;
  }
  const baseline = await db.financeBudgetVersion.findUnique({
    where: { id: baselineRef.id },
    include: {
      lines: {
        include: {
          financialAccount: { select: { id: true, canonicalSemantic: true } },
        },
      },
    },
  });
  if (!baseline || baseline.status !== "APPROVED") {
    return null;
  }
  return baseline;
}

export async function getCurrentForecastVsApprovedBudget(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<CurrentForecastVsApprovedBudgetResult> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const baseline = await loadGovernanceApprovedBudgetBaseline(db, ctx, financeYearId);

  if (!baseline) {
    return { kind: "NO_APPROVED_BUDGET" };
  }

  const bundle = await loadForecastHistoryBundle(db, ctx, financeYearId);
  if (!bundle?.currentVersionId) {
    return { kind: "NO_APPROVED_BUDGET" };
  }

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, canonicalSemantic: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const accountMeta = new Map<
    string,
    { name: string; accountType: "INCOME" | "EXPENSE" }
  >();
  const accountOrder: string[] = [];
  const accountTypes = new Map<string, "INCOME" | "EXPENSE">();
  for (const account of accounts) {
    if (!(PLANNING_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)) {
      continue;
    }
    const accountType = account.canonicalSemantic as "INCOME" | "EXPENSE";
    accountMeta.set(account.id, { name: account.name, accountType });
    accountTypes.set(account.id, accountType);
    accountOrder.push(account.id);
  }

  const budgetLines: ForecastVersionLineInput[] = baseline.lines
    .map((line) => {
      const accountType = accountTypes.get(line.financialAccountId);
      if (!accountType) return null;
      return {
        financialAccountId: line.financialAccountId,
        amountMinor: line.amountMinor,
        accountType,
      };
    })
    .filter((row): row is ForecastVersionLineInput => row !== null);

  const forecastLines = bundle.linesByVersionId.get(bundle.currentVersionId) ?? [];
  const summary = computeFinanceForecastVersionComparisonSummary({
    baseLines: budgetLines,
    comparisonLines: forecastLines,
  });

  const accountChanges = computeFinanceForecastAccountComparisons({
    baseLines: lineMapFromInputs(budgetLines),
    comparisonLines: lineMapFromInputs(forecastLines),
    accountTypes,
    accountOrder,
  });
  const largestChanges = sortForecastAccountComparisonsByLargestChange(
    accountChanges,
    accountOrder,
  );

  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, {
    id: bundle.forecastId,
    currentVersionId: bundle.currentVersionId,
  });

  const currencyCode = await resolveTenantBudgetCurrency(db, ctx);

  const comparison: FinanceForecastVersionComparison = {
    financeYearId,
    currencyCode,
    base: {
      kind: "APPROVED_BUDGET",
      budgetVersionId: baseline.id,
      versionNumber: baseline.versionNumber,
      presentation: {
        displayTitle: "Genehmigtes Budget",
        displaySubtitle: `Version ${baseline.versionNumber}`,
        revisionSourceLabel: "Genehmigtes Budget",
      },
    },
    comparison: buildRevisionRef(
      {
        forecastVersionId: bundle.currentVersionId,
        versionNumber: currentVersion?.versionNumber ?? 0,
        status: "CURRENT",
        revisionLabel: currentVersion?.revisionLabel ?? null,
        revisionSource: currentVersion?.revisionSource ?? null,
        asOfDate: currentVersion?.asOfDate ?? null,
      },
      true,
    ),
    summary,
    accountChanges: enrichAccountRows(accountChanges, accountMeta),
    largestChanges: enrichAccountRows(largestChanges, accountMeta),
  };

  return {
    kind: "COMPARISON",
    approvedBudgetVersionId: baseline.id,
    comparison,
  };
}

export function resolveForecastActualComparisonBoundary(input: {
  actualYtdMinor: number | null;
  annualForecastMinor: number | null;
}): ForecastActualComparisonBoundary {
  return {
    mayComputeMisleadingForecastMinusActual: false,
    contextualActualsThroughDateOnly: true,
    presentationPolicy: resolveActualVersusAnnualForecastPresentation(input),
  };
}
