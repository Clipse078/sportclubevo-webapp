import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import {
  buildProjectionAdoptionPreview,
  type ProjectionAdoptionPreviewResult,
} from "@/lib/finance/projection/projection-adoption-policy";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { resolveCanonicalCurrentForecastVersionByPointer } from "@/lib/finance/services/finance-forecast-service";
import { resolveCurrentProjectionVersionForYear } from "@/lib/finance/services/finance-projection-service";
import { resolveProjectionVersionStaleness } from "@/lib/finance/services/finance-projection-staleness-resolver";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financialAccount"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeProjection"
  | "financeProjectionVersion"
  | "financeProjectionLine"
  | "financeProjectionEvidence"
  | "financeProjectionReasonCode"
  | "financeProjectionAdoption"
  | "financeActualEntry"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeConfiguration"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type ProjectionAdoptionPreviewContext = ProjectionAdoptionPreviewResult & {
  financeProjectionId: string;
  canAdopt: boolean;
  blockReason:
    | null
    | "NO_FORECAST"
    | "NO_PROJECTION"
    | "STALE_PROJECTION"
    | "NO_ELIGIBLE_LINES";
};

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Finanzjahr nicht gefunden.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function loadAdoptionInputs(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<{
  financeProjectionId: string;
  projectionVersionId: string;
  projectionVersion: NonNullable<Awaited<ReturnType<typeof resolveCurrentProjectionVersionForYear>>>;
  sourceForecastVersionId: string;
  forecastId: string;
  projectedAmountByAccountId: Map<string, number | null>;
  currentForecastAmountByAccountId: Map<string, number | null>;
  accounts: Array<{
    accountId: string;
    semantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  staleness: Awaited<ReturnType<typeof resolveProjectionVersionStaleness>>;
}> {
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const projectionVersion = await resolveCurrentProjectionVersionForYear(db, ctx, financeYearId);
  if (!projectionVersion) {
    throw new FinanceDomainError(
      "FINANCE_NOT_FOUND",
      "Es liegt noch keine automatische Prognose vor.",
      404,
    );
  }

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true },
  });
  const currentVersion = forecast
    ? await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast)
    : null;
  if (!forecast?.currentVersionId || !currentVersion) {
    throw new FinanceDomainError(
      "FINANCE_NOT_FOUND",
      "Für die Übernahme wird zuerst eine aktuelle Prognose benötigt.",
      409,
    );
  }

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true, lifecycle: true },
  });

  const planningAccounts = accounts
    .filter(
      (row) =>
        (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(row.canonicalSemantic) &&
        (row.lifecycle === "ACTIVE" || row.lifecycle === "ARCHIVED"),
    )
    .map((row) => ({
      accountId: row.id,
      semantic: row.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: row.lifecycle,
    }));

  const projectedAmountByAccountId = new Map<string, number | null>();
  for (const line of projectionVersion.lines) {
    projectedAmountByAccountId.set(line.financialAccountId, line.projectedAmountMinor);
  }

  const currentForecastAmountByAccountId = new Map<string, number | null>();
  for (const line of currentVersion.lines) {
    currentForecastAmountByAccountId.set(line.financialAccountId, line.amountMinor);
  }

  const staleness = await resolveProjectionVersionStaleness(db, ctx, {
    financeYearId,
    projectionVersion,
    financialAccountIds: planningAccounts.map((row) => row.accountId),
  });

  return {
    financeProjectionId: projectionVersion.financeProjectionId,
    projectionVersionId: projectionVersion.id,
    projectionVersion,
    sourceForecastVersionId: currentVersion.id,
    forecastId: forecast.id,
    projectedAmountByAccountId,
    currentForecastAmountByAccountId,
    accounts: planningAccounts,
    staleness,
  };
}

export async function previewProjectionAdoptionForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<ProjectionAdoptionPreviewContext | null> {
  requireFinanceForecastView(ctx);

  const projectionVersion = await resolveCurrentProjectionVersionForYear(db, ctx, financeYearId);
  if (!projectionVersion) return null;

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true },
  });
  const currentVersion = forecast
    ? await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast)
    : null;
  if (!currentVersion) {
    return null;
  }

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true, lifecycle: true },
  });
  const planningAccounts = accounts
    .filter((row) =>
      (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(row.canonicalSemantic),
    )
    .map((row) => ({
      accountId: row.id,
      semantic: row.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: row.lifecycle,
    }));

  const projectedAmountByAccountId = new Map<string, number | null>(
    projectionVersion.lines.map((line) => [line.financialAccountId, line.projectedAmountMinor]),
  );
  const currentForecastAmountByAccountId = new Map<string, number | null>(
    currentVersion.lines.map((line) => [line.financialAccountId, line.amountMinor]),
  );

  const preview = buildProjectionAdoptionPreview({
    projectionVersionId: projectionVersion.id,
    sourceForecastVersionId: currentVersion.id,
    accounts: planningAccounts,
    projectedAmountByAccountId,
    currentForecastAmountByAccountId,
  });

  const staleness = await resolveProjectionVersionStaleness(db, ctx, {
    financeYearId,
    projectionVersion,
    financialAccountIds: planningAccounts.map((row) => row.accountId),
  });

  let blockReason: ProjectionAdoptionPreviewContext["blockReason"] = null;
  if (preview.eligibleAccountCount === 0) {
    blockReason = "NO_ELIGIBLE_LINES";
  } else if (staleness === "STALE") {
    blockReason = "STALE_PROJECTION";
  }

  return {
    ...preview,
    financeProjectionId: projectionVersion.financeProjectionId,
    canAdopt: blockReason === null,
    blockReason,
  };
}

export type AdoptProjectionResult = {
  targetForecastVersionId: string;
  targetVersionNumber: number;
  adoptionId: string;
};

export async function adoptProjectionForYear(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    expectedSourceForecastVersionId: string;
    expectedProjectionVersionId: string;
  },
): Promise<AdoptProjectionResult> {
  requireFinanceForecastManage(ctx);

  const loaded = await loadAdoptionInputs(db, ctx, input.financeYearId);

  if (loaded.sourceForecastVersionId !== input.expectedSourceForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED",
      "Die aktuelle Prognose wurde zwischenzeitlich geändert. Bitte prüft den Stand erneut.",
      409,
    );
  }

  if (loaded.projectionVersionId !== input.expectedProjectionVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ADOPTION_PROJECTION_CHANGED",
      "Die automatische Prognose wurde zwischenzeitlich aktualisiert. Bitte prüft den Stand erneut.",
      409,
    );
  }

  if (loaded.staleness === "STALE") {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ADOPTION_PROJECTION_STALE",
      "Seit der Berechnung sind neue Finanzdaten verfügbar. Aktualisiert zuerst die automatische Prognose.",
      409,
    );
  }

  const preview = buildProjectionAdoptionPreview({
    projectionVersionId: loaded.projectionVersionId,
    sourceForecastVersionId: loaded.sourceForecastVersionId,
    accounts: loaded.accounts,
    projectedAmountByAccountId: loaded.projectedAmountByAccountId,
    currentForecastAmountByAccountId: loaded.currentForecastAmountByAccountId,
  });

  if (preview.eligibleAccountCount === 0) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ADOPTION_NO_ELIGIBLE_LINES",
      "Es liegen derzeit keine verlässlichen Werte der automatischen Prognose vor, die übernommen werden können.",
      409,
    );
  }

  for (const line of preview.persistableLines) {
    assertSafeAmountMinor(line.amountMinor);
  }

  const run = async (tx: Db) => {
    const forecast = await tx.financeForecast.findUnique({
      where: { id: loaded.forecastId },
      include: { currentVersion: true, versions: { orderBy: { versionNumber: "desc" } } },
    });
    if (!forecast?.currentVersionId || !forecast.currentVersion) {
      throw new FinanceDomainError(
        "FINANCE_NOT_FOUND",
        "Für die Übernahme wird zuerst eine aktuelle Prognose benötigt.",
        409,
      );
    }
    if (forecast.currentVersionId !== input.expectedSourceForecastVersionId) {
      throw new FinanceDomainError(
        "FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED",
        "Die aktuelle Prognose wurde zwischenzeitlich geändert. Bitte prüft den Stand erneut.",
        409,
      );
    }

    const projection = await tx.financeProjection.findUnique({
      where: { id: loaded.financeProjectionId },
    });
    if (!projection?.currentProjectionVersionId) {
      throw new FinanceDomainError(
        "FINANCE_FORECAST_ADOPTION_PROJECTION_CHANGED",
        "Die automatische Prognose wurde zwischenzeitlich aktualisiert. Bitte prüft den Stand erneut.",
        409,
      );
    }
    if (projection.currentProjectionVersionId !== input.expectedProjectionVersionId) {
      throw new FinanceDomainError(
        "FINANCE_FORECAST_ADOPTION_PROJECTION_CHANGED",
        "Die automatische Prognose wurde zwischenzeitlich aktualisiert. Bitte prüft den Stand erneut.",
        409,
      );
    }

    const nextVersionNumber = (forecast.versions[0]?.versionNumber ?? 0) + 1;

    await tx.financeForecastVersion.update({
      where: { id: forecast.currentVersionId },
      data: { status: "SUPERSEDED" },
    });

    const targetVersion = await tx.financeForecastVersion.create({
      data: {
        forecastId: forecast.id,
        status: "CURRENT",
        versionNumber: nextVersionNumber,
        createdByUserId: ctx.userId,
        lines: {
          create: preview.persistableLines.map((line) => ({
            financialAccountId: line.financialAccountId,
            amountMinor: line.amountMinor,
          })),
        },
      },
    });

    await tx.financeForecast.update({
      where: { id: forecast.id },
      data: { currentVersionId: targetVersion.id },
    });

    const adoption = await tx.financeProjectionAdoption.create({
      data: {
        tenantId: ctx.tenantId,
        financeProjectionId: loaded.financeProjectionId,
        projectionVersionId: loaded.projectionVersionId,
        sourceForecastVersionId: loaded.sourceForecastVersionId,
        targetForecastVersionId: targetVersion.id,
        applyScope: "WHOLE_FINANCE_YEAR",
        appliedByUserId: ctx.userId,
      },
    });

    return {
      targetForecastVersionId: targetVersion.id,
      targetVersionNumber: nextVersionNumber,
      adoptionId: adoption.id,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}
