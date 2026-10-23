import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { requireFinanceForecastView, type FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { findCutoffRelativePeriodIndex, latestActualDateInSeries } from "@/lib/finance/projection/projection-actual-observations";
import { assessProjectionDataSufficiency } from "@/lib/finance/projection/projection-data-sufficiency";
import { computeProjectionEvidenceFingerprint } from "@/lib/finance/projection/projection-evidence-fingerprint";
import { buildProjectionEvidenceMaterial } from "@/lib/finance/projection/projection-evidence-material-builder";
import type {
  ProjectionBudgetContextEvidence,
  ProjectionEvidenceContext,
  ProjectionForecastContextEvidence,
} from "@/lib/finance/projection/projection-evidence-types";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeConfiguration"
  | "financeYear"
  | "financialAccount"
  | "financeActualEntry"
  | "financeBudget"
  | "financeForecast"
>;

function parseUtcDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INVALID_CUTOFF",
      "actualsThroughDate must be an ISO calendar date (YYYY-MM-DD).",
    );
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Currency must be a three-letter ISO 4217 code.",
    );
  }
  return normalized;
}

async function resolveTenantBaseCurrency(db: Db, tenantId: string): Promise<string> {
  const config = await db.financeConfiguration.findUnique({
    where: { tenantId },
    select: { baseCurrency: true },
  });
  const currency = config?.baseCurrency?.trim().toUpperCase() ?? null;
  if (!currency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Organisation base currency must be configured before projection evidence extraction.",
      409,
    );
  }
  return currency;
}

export type ProjectionEvidenceLoaderBundle = {
  years: Array<{
    id: string;
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }>;
  entriesByYearAccount: Map<string, Map<string, Array<{ effectiveDate: Date; amountMinor: number }>>>;
  budgetByYearId: Map<
    string,
    {
      budgetVersionId: string;
      currency: string;
      amountByAccountId: Map<string, number>;
    } | null
  >;
  forecastByYearId: Map<
    string,
    {
      forecastVersionId: string;
      currency: string;
      amountByAccountId: Map<string, number>;
    } | null
  >;
  accounts: Map<string, { tenantId: string; lifecycle: "ACTIVE" | "ARCHIVED" }>;
};

/**
 * Batch loader for finance-year projection evidence (avoids per-account N+1 for shared slices).
 */
export async function loadProjectionEvidenceLoaderBundle(
  db: Db & Pick<PrismaClient, "financeBudgetVersion" | "financeBudgetLine" | "financeForecastVersion" | "financeForecastLine">,
  ctx: FinanceAuthContext,
  input: { financeYearId: string; actualsThroughDate: string },
): Promise<ProjectionEvidenceLoaderBundle> {
  requireFinanceForecastView(ctx);
  const cutoff = parseUtcDateOnly(input.actualsThroughDate);

  const targetYear = await db.financeYear.findUnique({ where: { id: input.financeYearId } });
  if (!targetYear) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(targetYear.tenantId, ctx.tenantId, "Financial year");

  const years = await db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { startDate: "asc" },
    select: { id: true, tenantId: true, name: true, startDate: true, endDate: true },
  });

  const priorYears = years.filter((y) => y.endDate.getTime() < targetYear.startDate.getTime());
  const relevantYearIds = [targetYear.id, ...priorYears.map((y) => y.id)];

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, lifecycle: true },
  });
  const accountMap = new Map(
    accounts.map((a) => [a.id, { tenantId: a.tenantId, lifecycle: a.lifecycle }]),
  );

  const baseCurrency = await resolveTenantBaseCurrency(db, ctx.tenantId);

  const entries = await db.financeActualEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: { in: relevantYearIds },
      effectiveDate: { lte: cutoff },
    },
    select: {
      financeYearId: true,
      financialAccountId: true,
      effectiveDate: true,
      amountMinor: true,
      currency: true,
    },
    orderBy: [{ financeYearId: "asc" }, { financialAccountId: "asc" }, { effectiveDate: "asc" }],
  });

  const entriesByYearAccount = new Map<string, Map<string, Array<{ effectiveDate: Date; amountMinor: number }>>>();
  for (const row of entries) {
    const entryCurrency = normalizeCurrency(row.currency);
    if (entryCurrency !== baseCurrency) {
      throw new FinanceDomainError(
        "FINANCE_INVALID_CURRENCY",
        "Actual entry currency must match organisation base currency for projection evidence.",
        409,
      );
    }
    const account = accountMap.get(row.financialAccountId);
    if (!account) continue;
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");

    let byAccount = entriesByYearAccount.get(row.financeYearId);
    if (!byAccount) {
      byAccount = new Map();
      entriesByYearAccount.set(row.financeYearId, byAccount);
    }
    const list = byAccount.get(row.financialAccountId) ?? [];
    list.push({ effectiveDate: row.effectiveDate, amountMinor: row.amountMinor });
    byAccount.set(row.financialAccountId, list);
  }

  const budgetByYearId = new Map<
    string,
    { budgetVersionId: string; currency: string; amountByAccountId: Map<string, number> } | null
  >();
  for (const yearId of relevantYearIds) {
    const budget = await db.financeBudget.findUnique({
      where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: yearId } },
      include: {
        versions: {
          include: { lines: true },
        },
      },
    });
    if (!budget) {
      budgetByYearId.set(yearId, null);
      continue;
    }
    const measure = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: budget.currentBaselineVersionId,
      versions: budget.versions.map((v) => ({
        id: v.id,
        status: v.status,
        baseCurrency: v.baseCurrency,
        approvedAt: v.approvedAt,
        lines: v.lines.map((l) => ({
          financialAccountId: l.financialAccountId,
          amountMinor: l.amountMinor,
        })),
      })),
    });
    if (!measure) {
      budgetByYearId.set(yearId, null);
      continue;
    }
    const measureCurrency = measure.baseCurrency?.trim().toUpperCase() ?? baseCurrency;
    budgetByYearId.set(yearId, {
      budgetVersionId: measure.budgetVersionId,
      currency: measureCurrency,
      amountByAccountId: new Map(measure.valuesByAccountId),
    });
  }

  const forecastByYearId = new Map<
    string,
    { forecastVersionId: string; currency: string; amountByAccountId: Map<string, number> } | null
  >();
  for (const yearId of relevantYearIds) {
    if (yearId !== targetYear.id) {
      forecastByYearId.set(yearId, null);
      continue;
    }
    const forecast = await db.financeForecast.findUnique({
      where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: yearId } },
      include: { currentVersion: { include: { lines: true } } },
    });
    if (!forecast?.currentVersion) {
      forecastByYearId.set(yearId, null);
      continue;
    }
    const amountByAccountId = new Map<string, number>();
    for (const line of forecast.currentVersion.lines) {
      amountByAccountId.set(line.financialAccountId, line.amountMinor);
    }
    forecastByYearId.set(yearId, {
      forecastVersionId: forecast.currentVersion.id,
      currency: baseCurrency,
      amountByAccountId,
    });
  }

  return {
    years,
    entriesByYearAccount,
    budgetByYearId,
    forecastByYearId,
    accounts: accountMap,
  };
}

function resolveBudgetContext(
  bundle: ProjectionEvidenceLoaderBundle,
  financeYearId: string,
  financialAccountId: string,
  currency: string,
): ProjectionBudgetContextEvidence | null {
  const row = bundle.budgetByYearId.get(financeYearId);
  if (!row) return null;
  const amount = row.amountByAccountId.get(financialAccountId);
  if (amount === undefined) return null;
  return {
    kind: "BUDGET_BASELINE",
    financeYearId,
    financialAccountId,
    budgetVersionId: row.budgetVersionId,
    amountMinor: amount,
    currency: row.currency ?? currency,
  };
}

function resolveForecastContext(
  bundle: ProjectionEvidenceLoaderBundle,
  financeYearId: string,
  financialAccountId: string,
  currency: string,
): ProjectionForecastContextEvidence | null {
  const row = bundle.forecastByYearId.get(financeYearId);
  if (!row) return null;
  const amount = row.amountByAccountId.get(financialAccountId);
  if (amount === undefined) return null;
  return {
    kind: "CURRENT_FORECAST",
    financeYearId,
    financialAccountId,
    forecastVersionId: row.forecastVersionId,
    amountMinor: amount,
    currency: row.currency ?? currency,
  };
}

export function buildProjectionEvidenceContextFromBundle(
  bundle: ProjectionEvidenceLoaderBundle,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    financialAccountId: string;
    actualsThroughDate: string;
    currency: string;
  },
): ProjectionEvidenceContext {
  const account = bundle.accounts.get(input.financialAccountId);
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");

  const targetYear = bundle.years.find((y) => y.id === input.financeYearId);
  if (!targetYear) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(targetYear.tenantId, ctx.tenantId, "Financial year");

  const priorYears = bundle.years.filter((y) => y.endDate.getTime() < targetYear.startDate.getTime());
  const cutoff = parseUtcDateOnly(input.actualsThroughDate);
  const currency = normalizeCurrency(input.currency);

  const actualEntriesByYearId = new Map<
    string,
    Array<{ effectiveDate: Date; amountMinor: number }>
  >();
  for (const yearId of [targetYear.id, ...priorYears.map((y) => y.id)]) {
    const byAccount = bundle.entriesByYearAccount.get(yearId);
    actualEntriesByYearId.set(yearId, byAccount?.get(input.financialAccountId) ?? []);
  }

  const material = buildProjectionEvidenceMaterial({
    tenantId: ctx.tenantId,
    financeYearId: input.financeYearId,
    financialAccountId: input.financialAccountId,
    currency,
    actualsThroughDate: cutoff,
    actualsThroughDateIso: input.actualsThroughDate,
    targetYear,
    priorYears,
    actualEntriesByYearId,
    budgetContext: resolveBudgetContext(bundle, input.financeYearId, input.financialAccountId, currency),
    forecastContext: resolveForecastContext(bundle, input.financeYearId, input.financialAccountId, currency),
  });

  const sufficiency = assessProjectionDataSufficiency(material, {
    targetAccountArchived: account.lifecycle === "ARCHIVED",
  });

  const allCurrentEntries = actualEntriesByYearId.get(targetYear.id) ?? [];
  sufficiency.metrics.cutoffRelativePeriodIndex = findCutoffRelativePeriodIndex(
    material.currentYearActuals,
    cutoff,
  );
  sufficiency.metrics.latestActualDate = latestActualDateInSeries([
    ...allCurrentEntries,
    ...priorYears.flatMap((y) => actualEntriesByYearId.get(y.id) ?? []),
  ]);

  const evidenceFingerprint = computeProjectionEvidenceFingerprint(material);

  return {
    ...material,
    sufficiency,
    evidenceFingerprint,
  };
}

export async function getProjectionEvidenceContext(
  db: Db &
    Pick<PrismaClient, "financeBudgetVersion" | "financeBudgetLine" | "financeForecastVersion" | "financeForecastLine">,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    financialAccountId: string;
    actualsThroughDate: string;
  },
): Promise<ProjectionEvidenceContext> {
  const currency = await resolveTenantBaseCurrency(db, ctx.tenantId);
  const bundle = await loadProjectionEvidenceLoaderBundle(db, ctx, {
    financeYearId: input.financeYearId,
    actualsThroughDate: input.actualsThroughDate,
  });
  return buildProjectionEvidenceContextFromBundle(bundle, ctx, {
    ...input,
    currency,
  });
}

export async function getProjectionEvidenceContextForFinanceYearAccounts(
  db: Db &
    Pick<PrismaClient, "financeBudgetVersion" | "financeBudgetLine" | "financeForecastVersion" | "financeForecastLine">,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    actualsThroughDate: string;
    financialAccountIds: readonly string[];
  },
): Promise<Map<string, ProjectionEvidenceContext>> {
  const currency = await resolveTenantBaseCurrency(db, ctx.tenantId);
  const bundle = await loadProjectionEvidenceLoaderBundle(db, ctx, {
    financeYearId: input.financeYearId,
    actualsThroughDate: input.actualsThroughDate,
  });

  const out = new Map<string, ProjectionEvidenceContext>();
  for (const financialAccountId of input.financialAccountIds) {
    out.set(
      financialAccountId,
      buildProjectionEvidenceContextFromBundle(bundle, ctx, {
        financeYearId: input.financeYearId,
        financialAccountId,
        actualsThroughDate: input.actualsThroughDate,
        currency,
      }),
    );
  }
  return out;
}
