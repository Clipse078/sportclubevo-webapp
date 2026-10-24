import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import type { ForecastCreationMode } from "@/lib/finance/forecast/forecast-contract";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeYear"
  | "financialAccount"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountForForecastOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  financialAccountId: string,
) {
  const account = await db.financialAccount.findUnique({ where: { id: financialAccountId } });
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  if (
    !(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_INVALID_ACCOUNT",
      "Forecast lines must reference income or expense accounts.",
    );
  }
  return account;
}

async function getForecastForYear(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  return db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: {
      currentVersion: { include: { lines: true } },
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });
}

async function getVersionOrThrow(db: Db, ctx: FinanceAuthContext, versionId: string) {
  const version = await db.financeForecastVersion.findUnique({
    where: { id: versionId },
    include: { forecast: true },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast version not found.", 404);
  }
  assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");
  return version;
}

/**
 * Canonical current forecast version for reads and mutations: always follow
 * FinanceForecast.currentVersionId → FinanceForecastVersion (never stale includes).
 */
export async function resolveCanonicalCurrentForecastVersionByPointer(
  db: Db,
  ctx: FinanceAuthContext,
  forecast: { id: string; currentVersionId: string | null },
) {
  if (!forecast.currentVersionId) return null;
  const version = await db.financeForecastVersion.findUnique({
    where: { id: forecast.currentVersionId },
    include: {
      lines: true,
      forecast: { select: { id: true, tenantId: true } },
    },
  });
  if (!version || version.forecastId !== forecast.id) {
    return null;
  }
  assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");
  return version;
}

export async function resolveCurrentForecastVersionForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceForecastView(ctx);
  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true },
  });
  if (!forecast?.currentVersionId) return null;
  return resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
}

export type CreateForecastResult = {
  forecastId: string;
  currentVersionId: string;
  mode: ForecastCreationMode;
  copiedLineCount: number;
};

async function loadBaselineLinesForInitialization(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  const budget = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: { versions: true },
  });
  if (!budget) return null;
  const baseline = resolveCurrentGovernanceBaselineVersion({
    currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
    versions: budget.versions,
  });
  if (!baseline) return null;
  const version = await db.financeBudgetVersion.findUnique({
    where: { id: baseline.id },
    include: {
      lines: {
        include: { financialAccount: { select: { lifecycle: true, canonicalSemantic: true } } },
      },
    },
  });
  if (!version) return null;
  return version.lines.filter(
    (line) =>
      line.financialAccount.lifecycle === "ACTIVE" &&
      (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(
        line.financialAccount.canonicalSemantic,
      ),
  );
}

export async function createForecastForYear(
  db: Db,
  ctx: FinanceAuthContext,
  input: { financeYearId: string; mode: ForecastCreationMode },
): Promise<CreateForecastResult> {
  requireFinanceForecastManage(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  const existing = await getForecastForYear(db, ctx, input.financeYearId);
  if (existing?.currentVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_EXISTS",
      "A forecast already exists for this financial year.",
      409,
    );
  }

  let seedLines: Array<{ financialAccountId: string; amountMinor: number }> = [];
  if (input.mode === "FROM_BASELINE") {
    const baselineLines = await loadBaselineLinesForInitialization(
      db,
      ctx,
      input.financeYearId,
    );
    if (!baselineLines || baselineLines.length === 0) {
      throw new FinanceDomainError(
        "FINANCE_FORECAST_NO_BASELINE",
        "Budget-based initialization requires an approved governance baseline.",
        409,
      );
    }
    seedLines = baselineLines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    }));
  }

  const run = async (tx: Db) => {
    let forecastId = existing?.id;
    if (!forecastId) {
      try {
        const created = await tx.financeForecast.create({
          data: {
            tenantId: ctx.tenantId,
            financeYearId: input.financeYearId,
            createdByUserId: ctx.userId,
          },
        });
        forecastId = created.id;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new FinanceDomainError(
            "FINANCE_FORECAST_EXISTS",
            "A forecast already exists for this financial year.",
            409,
          );
        }
        throw error;
      }
    }

    const version = await tx.financeForecastVersion.create({
      data: {
        forecastId,
        status: "CURRENT",
        versionNumber: 1,
        createdByUserId: ctx.userId,
        lines: seedLines.length
          ? {
              create: seedLines.map((line) => ({
                financialAccountId: line.financialAccountId,
                amountMinor: line.amountMinor,
              })),
            }
          : undefined,
      },
    });

    await tx.financeForecast.update({
      where: { id: forecastId },
      data: { currentVersionId: version.id },
    });

    return {
      forecastId,
      currentVersionId: version.id,
      mode: input.mode,
      copiedLineCount: seedLines.length,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

export async function upsertForecastLine(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    forecastVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  },
) {
  requireFinanceForecastManage(ctx);
  assertSafeAmountMinor(input.amountMinor);

  const version = await getVersionOrThrow(db, ctx, input.forecastVersionId);
  if (version.status !== "CURRENT") {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_IMMUTABLE",
      "Only the current forecast version can be edited.",
      409,
    );
  }

  const forecast = await db.financeForecast.findUnique({
    where: { id: version.forecastId },
  });
  if (!forecast || forecast.currentVersionId !== version.id) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_NOT_CURRENT",
      "Forecast line edits must target the current forecast version.",
      409,
    );
  }

  const account = await getAccountForForecastOrThrow(db, ctx, input.financialAccountId);
  if (account.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ARCHIVED_ACCOUNT",
      "Archived accounts cannot receive new forecast amounts.",
      409,
    );
  }

  return db.financeForecastLine.upsert({
    where: {
      forecastVersionId_financialAccountId: {
        forecastVersionId: input.forecastVersionId,
        financialAccountId: input.financialAccountId,
      },
    },
    create: {
      forecastVersionId: input.forecastVersionId,
      financialAccountId: input.financialAccountId,
      amountMinor: input.amountMinor,
    },
    update: { amountMinor: input.amountMinor },
  });
}

export async function loadForecastCreationContext(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<{ canInitializeFromBaseline: boolean }> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);
  const baselineLines = await loadBaselineLinesForInitialization(db, ctx, financeYearId);
  return { canInitializeFromBaseline: Boolean(baselineLines && baselineLines.length > 0) };
}

export async function listFinanceYearsForForecast(db: Db, ctx: FinanceAuthContext) {
  requireFinanceForecastView(ctx);
  return db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true, status: true },
  });
}
