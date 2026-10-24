import type { PrismaClient } from "@prisma/client";
import {
  formatFinanceCalendarDateIso,
  parseFinanceCalendarDateIso,
} from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import type {
  FormalizeCurrentForecastResult,
  FormalReforecastPreviewResult,
} from "@/lib/finance/forecast/formal-reforecast-contract";
import { recommendFormalReforecastAsOfDate } from "@/lib/finance/forecast/formal-reforecast-date-recommendation";
import { normalizeFormalReforecastRevisionLabel } from "@/lib/finance/forecast/formal-reforecast-label";
import { forecastTotalsFromRows } from "@/lib/finance/forecast/forecast-presentation";
import { validateFormalRevisionMetadata } from "@/lib/finance/forecast/forecast-revision-metadata-validation";
import { persistFormalForecastRevision } from "@/lib/finance/services/finance-forecast-revision-service";
import { resolveCanonicalCurrentForecastVersionByPointer } from "@/lib/finance/services/finance-forecast-service";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financialAccount"
  | "financeProjection"
  | "financeProjectionVersion"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type BuildManualFormalReforecastDatesInput = {
  asOfDate: string;
  actualsThroughDate?: string | null;
};

/** Application-layer date builder — defaults actuals cutoff to Datenstand when omitted. */
export function buildManualFormalReforecastDates(
  input: BuildManualFormalReforecastDatesInput,
): { asOfDate: string; actualsThroughDate: string } {
  const asOfDate = input.asOfDate.trim();
  const actualsThroughDate = (input.actualsThroughDate ?? asOfDate).trim();
  return { asOfDate, actualsThroughDate };
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function loadCurrentForecastContext(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  const financeYear = await getFinanceYearOrThrow(db, ctx, financeYearId);

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true, tenantId: true },
  });
  if (!forecast?.currentVersionId) {
    throw new FinanceDomainError(
      "FINANCE_NOT_FOUND",
      "Forecast not found for financial year.",
      404,
    );
  }

  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
  if (!currentVersion) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Current forecast version not found.", 404);
  }

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true },
  });
  const semanticByAccountId = new Map(
    accounts.map((row) => [row.id, row.canonicalSemantic as string]),
  );

  const lines = await db.financeForecastLine.findMany({
    where: { forecastVersionId: currentVersion.id },
    select: { financialAccountId: true, amountMinor: true },
  });

  const totals = computeForecastTotalsFromLines(lines, semanticByAccountId);

  const latestVersion = await db.financeForecastVersion.findFirst({
    where: { forecastId: forecast.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const nextVersionNumber = (latestVersion?.versionNumber ?? currentVersion.versionNumber) + 1;

  const previousFormalRevision = await resolvePreviousFormalRevisionSummary(db, forecast.id);

  return {
    financeYear,
    forecast,
    currentVersion,
    lines,
    totals,
    nextVersionNumber,
    previousFormalRevision,
  };
}

function computeForecastTotalsFromLines(
  lines: Array<{ financialAccountId: string; amountMinor: number }>,
  semanticByAccountId: Map<string, string>,
) {
  const rows = lines
    .map((line) => {
      const semantic = semanticByAccountId.get(line.financialAccountId);
      if (
        !semantic ||
        !(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(semantic)
      ) {
        return null;
      }
      return { amountMinor: line.amountMinor, semantic: semantic as "INCOME" | "EXPENSE" };
    })
    .filter((row): row is { amountMinor: number; semantic: "INCOME" | "EXPENSE" } => row !== null);

  const totals = forecastTotalsFromRows(rows);
  return {
    incomeMinor: totals.totalIncomeMinor,
    expenseMinor: totals.totalExpenseMinor,
    resultMinor: totals.resultMinor,
  };
}

async function resolvePreviousFormalRevisionSummary(
  db: Pick<PrismaClient, "financeForecastVersion">,
  forecastId: string,
) {
  const superseded = await db.financeForecastVersion.findMany({
    where: { forecastId, status: "SUPERSEDED" },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      revisionSource: true,
      revisionLabel: true,
      asOfDate: true,
      actualsThroughDate: true,
    },
  });

  const withMetadata = superseded.find(
    (row) =>
      row.revisionSource != null ||
      row.asOfDate != null ||
      row.actualsThroughDate != null ||
      row.revisionLabel != null,
  );
  if (!withMetadata) return null;

  return {
    versionId: withMetadata.id,
    versionNumber: withMetadata.versionNumber,
    revisionSource: withMetadata.revisionSource,
    revisionLabel: withMetadata.revisionLabel,
    asOfDate: withMetadata.asOfDate
      ? formatFinanceCalendarDateIso(withMetadata.asOfDate)
      : null,
    actualsThroughDate: withMetadata.actualsThroughDate
      ? formatFinanceCalendarDateIso(withMetadata.actualsThroughDate)
      : null,
  };
}

function resolvePreviewDates(
  financeYear: { startDate: Date; endDate: Date },
  input: { asOfDate?: string; actualsThroughDate?: string | null },
): { asOfDate: string; actualsThroughDate: string; recommendedAsOfDate: string | null } {
  const recommendedAsOfDate = recommendFormalReforecastAsOfDate(financeYear);
  const asOfDate = (input.asOfDate ?? recommendedAsOfDate)?.trim();
  if (!asOfDate) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_DATE",
      "asOfDate must fall within the tenant financial year.",
    );
  }
  parseFinanceCalendarDateIso(asOfDate);
  const { actualsThroughDate } = buildManualFormalReforecastDates({
    asOfDate,
    actualsThroughDate: input.actualsThroughDate,
  });
  return { asOfDate, actualsThroughDate, recommendedAsOfDate };
}

/**
 * Read-only preview for confirmation UI — performs no writes.
 */
export async function previewFormalCurrentForecast(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    asOfDate?: string;
    actualsThroughDate?: string | null;
    revisionLabel?: string | null;
  },
): Promise<FormalReforecastPreviewResult> {
  requireFinanceForecastView(ctx);

  const loaded = await loadCurrentForecastContext(db, ctx, input.financeYearId);
  const dates = resolvePreviewDates(loaded.financeYear, input);
  const revisionLabel = normalizeFormalReforecastRevisionLabel(input.revisionLabel);
  validateFormalRevisionMetadata(
    {
      asOfDate: dates.asOfDate,
      actualsThroughDate: dates.actualsThroughDate,
      revisionSource: "MANUAL_REFORECAST",
      revisionLabel,
    },
    loaded.financeYear,
  );

  return {
    financeYearId: input.financeYearId,
    forecastId: loaded.forecast.id,
    currentForecastVersionId: loaded.currentVersion.id,
    currentVersionNumber: loaded.currentVersion.versionNumber,
    nextVersionNumber: loaded.nextVersionNumber,
    lineCount: loaded.lines.length,
    incomeMinor: loaded.totals.incomeMinor,
    expenseMinor: loaded.totals.expenseMinor,
    resultMinor: loaded.totals.resultMinor,
    asOfDate: dates.asOfDate,
    actualsThroughDate: dates.actualsThroughDate,
    revisionLabel,
    recommendedAsOfDate: dates.recommendedAsOfDate,
    amountsUnchangedByFormalization: true,
    previousFormalRevision: loaded.previousFormalRevision,
  };
}

/**
 * Tenant-facing formal reforecast — "Neue Prognose festhalten".
 * `revisionSource` is always MANUAL_REFORECAST (not caller-controlled).
 */
export async function formalizeCurrentForecast(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    expectedCurrentForecastVersionId: string;
    asOfDate: string;
    actualsThroughDate?: string | null;
    revisionLabel?: string | null;
  },
): Promise<FormalizeCurrentForecastResult> {
  requireFinanceForecastManage(ctx);

  const loaded = await loadCurrentForecastContext(db, ctx, input.financeYearId);
  if (loaded.currentVersion.id !== input.expectedCurrentForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_STALE_CURRENT",
      "The current forecast version changed. Refresh and try again.",
      409,
    );
  }

  const revisionLabel = normalizeFormalReforecastRevisionLabel(input.revisionLabel);
  const { asOfDate, actualsThroughDate } = buildManualFormalReforecastDates(input);

  const beforeTotals = loaded.totals;
  const beforeLineCount = loaded.lines.length;

  const persisted = await persistFormalForecastRevision(db, {
    tenantId: ctx.tenantId,
    financeYearId: input.financeYearId,
    expectedCurrentForecastVersionId: input.expectedCurrentForecastVersionId,
    asOfDate,
    actualsThroughDate,
    revisionSource: "MANUAL_REFORECAST",
    revisionLabel,
    sourceProjectionVersionId: null,
    previousVersionId: loaded.currentVersion.id,
    createdByUserId: ctx.userId,
  });

  const superseded = await db.financeForecastVersion.findUnique({
    where: { id: persisted.supersededVersionId },
    select: { versionNumber: true },
  });
  const promoted = await db.financeForecastVersion.findUnique({
    where: { id: persisted.newCurrentVersionId },
    select: {
      revisionSource: true,
      revisionLabel: true,
      asOfDate: true,
      actualsThroughDate: true,
      sourceProjectionVersionId: true,
    },
  });

  const promotedLines = await db.financeForecastLine.findMany({
    where: { forecastVersionId: persisted.newCurrentVersionId },
    select: { financialAccountId: true, amountMinor: true },
  });

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true },
  });
  const semanticByAccountId = new Map(
    accounts.map((row) => [row.id, row.canonicalSemantic as string]),
  );
  const afterTotals = computeForecastTotalsFromLines(promotedLines, semanticByAccountId);

  if (
    promotedLines.length !== beforeLineCount ||
    afterTotals.incomeMinor !== beforeTotals.incomeMinor ||
    afterTotals.expenseMinor !== beforeTotals.expenseMinor ||
    afterTotals.resultMinor !== beforeTotals.resultMinor
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LINEAGE",
      "Formal reforecast must preserve the current forecast snapshot amounts.",
      409,
    );
  }

  if (promoted?.revisionSource !== "MANUAL_REFORECAST") {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_SOURCE",
      "Manual formal reforecast must use MANUAL_REFORECAST revision source.",
      409,
    );
  }
  if (promoted?.sourceProjectionVersionId != null) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_PROJECTION_SOURCE",
      "Manual formal reforecast must not attach projection provenance.",
      409,
    );
  }

  return {
    forecastId: persisted.forecastId,
    previousVersionId: persisted.supersededVersionId,
    previousVersionNumber: superseded?.versionNumber ?? loaded.currentVersion.versionNumber,
    currentVersionId: persisted.newCurrentVersionId,
    currentVersionNumber: persisted.newVersionNumber,
    asOfDate,
    actualsThroughDate,
    revisionSource: "MANUAL_REFORECAST",
    revisionLabel: promoted?.revisionLabel ?? revisionLabel,
    lineCount: promotedLines.length,
    incomeMinor: afterTotals.incomeMinor,
    expenseMinor: afterTotals.expenseMinor,
    resultMinor: afterTotals.resultMinor,
  };
}
