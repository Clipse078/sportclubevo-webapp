import type { PrismaClient } from "@prisma/client";
import { aggregateActualTotalsByAccount } from "@/lib/finance/actual/aggregate-actuals";
import { isEffectiveDateOnOrBeforeCutoff } from "@/lib/finance/actual/period-semantics";
import {
  formatFinanceCalendarDateIso,
  parseFinanceCalendarDateIso,
} from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { classifyExpectedEventTemporalPosition } from "@/lib/finance/forecast/classify-expected-event-temporal-position";
import { buildForecastTimingIntelligence } from "@/lib/finance/forecast/build-forecast-timing-intelligence";
import type {
  FinanceExpectedFinancialEventReadModel,
  FinanceForecastTimingCurrentForecastContext,
  FinanceForecastTimingOverviewReadModel,
} from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import { FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY } from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import { mapExpectedFinancialEventRow } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeActualEntry"
  | "financeExpectedFinancialEvent"
  | "financialAccount"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type LoadFinanceForecastTimingOverviewInput = {
  financeYearId: string;
  /**
   * Explicit actuals-through cutoff (YYYY-MM-DD). When omitted, uses the current
   * forecast version `actualsThroughDate`. Never derived from the system clock.
   */
  actualsThroughDateIso?: string;
  upcomingLimit?: number;
};

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

function resolveCutoffIso(input: {
  callerIso?: string;
  forecastVersionActualsThrough: Date | null;
}): string {
  const fromVersion = input.forecastVersionActualsThrough
    ? formatFinanceCalendarDateIso(input.forecastVersionActualsThrough)
    : null;

  if (input.callerIso) {
    parseFinanceCalendarDateIso(input.callerIso);
    if (fromVersion && input.callerIso.trim() !== fromVersion) {
      throw new FinanceDomainError(
        "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF",
        "Actuals-through cutoff must match the current forecast version context.",
        400,
      );
    }
    return input.callerIso.trim();
  }

  if (!fromVersion) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF",
      "Actuals-through cutoff must be supplied explicitly when the current forecast version has none.",
      400,
    );
  }
  return fromVersion;
}

type TimingSnapshot = {
  currentForecast: FinanceForecastTimingCurrentForecastContext;
  forecastAmountByAccountId: Map<string, number>;
  actualThroughCutoffByAccountId: Map<string, number>;
  events: ReturnType<typeof mapExpectedFinancialEventRow>[];
  planningAccounts: Array<{
    id: string;
    name: string;
    accountType: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  actualsThroughDateIso: string;
};

async function loadTimingSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceForecastTimingOverviewInput,
): Promise<TimingSnapshot> {
  const forecast = await db.financeForecast.findUnique({
    where: {
      tenantId_financeYearId: {
        tenantId: ctx.tenantId,
        financeYearId: input.financeYearId,
      },
    },
    select: { id: true, currentVersionId: true, tenantId: true },
  });

  let currentForecast: FinanceForecastTimingCurrentForecastContext = { kind: "UNAVAILABLE" };
  const forecastAmountByAccountId = new Map<string, number>();
  let forecastVersionActualsThrough: Date | null = null;

  if (forecast?.currentVersionId) {
    const version = await db.financeForecastVersion.findUnique({
      where: { id: forecast.currentVersionId },
      include: {
        lines: true,
        forecast: { select: { id: true, tenantId: true } },
      },
    });
    if (version && version.forecastId === forecast.id) {
      assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");
      currentForecast = {
        kind: "AVAILABLE",
        forecastId: forecast.id,
        forecastVersionId: version.id,
        versionNumber: version.versionNumber,
        asOfDateIso: version.asOfDate
          ? formatFinanceCalendarDateIso(version.asOfDate)
          : null,
        actualsThroughDateIso: version.actualsThroughDate
          ? formatFinanceCalendarDateIso(version.actualsThroughDate)
          : null,
      };
      forecastVersionActualsThrough = version.actualsThroughDate ?? null;
      for (const line of version.lines) {
        forecastAmountByAccountId.set(line.financialAccountId, line.amountMinor);
      }
    }
  }

  const actualsThroughDateIso = resolveCutoffIso({
    callerIso: input.actualsThroughDateIso,
    forecastVersionActualsThrough,
  });
  const cutoffDate = parseFinanceCalendarDateIso(actualsThroughDateIso);

  const [planningAccountRows, actualRows, eventRows] = await Promise.all([
    db.financialAccount.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        name: true,
        canonicalSemantic: true,
        lifecycle: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.financeActualEntry.findMany({
      where: {
        tenantId: ctx.tenantId,
        financeYearId: input.financeYearId,
      },
      select: { effectiveDate: true, amountMinor: true, financialAccountId: true },
    }),
    db.financeExpectedFinancialEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        financeYearId: input.financeYearId,
      },
    }),
  ]);

  const planningAccounts = planningAccountRows
    .filter((account) =>
      (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic),
    )
    .map((account) => ({
      id: account.id,
      name: account.name,
      accountType: account.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: account.lifecycle as "ACTIVE" | "ARCHIVED",
    }));

  const throughCutoff = actualRows.filter((row) =>
    isEffectiveDateOnOrBeforeCutoff(row.effectiveDate, cutoffDate),
  );
  const actualThroughCutoffByAccountId = aggregateActualTotalsByAccount(throughCutoff);

  return {
    currentForecast,
    forecastAmountByAccountId,
    actualThroughCutoffByAccountId,
    events: eventRows.map(mapExpectedFinancialEventRow),
    planningAccounts,
    actualsThroughDateIso,
  };
}

export async function loadFinanceForecastTimingOverview(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadFinanceForecastTimingOverviewInput,
): Promise<FinanceForecastTimingOverviewReadModel> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  const snapshot = db.$transaction
    ? await db.$transaction(async (tx) =>
        loadTimingSnapshot(tx as Db, ctx, input),
      )
    : await loadTimingSnapshot(db, ctx, input);

  return buildForecastTimingIntelligence({
    financeYearId: input.financeYearId,
    actualsThroughDateIso: snapshot.actualsThroughDateIso,
    currentForecast: snapshot.currentForecast,
    planningAccounts: snapshot.planningAccounts,
    forecastAmountByAccountId: snapshot.forecastAmountByAccountId,
    actualThroughCutoffByAccountId: snapshot.actualThroughCutoffByAccountId,
    events: snapshot.events,
    upcomingLimit: input.upcomingLimit,
  });
}

export async function loadFinanceExpectedFinancialEventDetail(
  db: Db,
  ctx: FinanceAuthContext,
  input: { eventId: string; actualsThroughDateIso?: string },
): Promise<FinanceExpectedFinancialEventReadModel> {
  requireFinanceForecastView(ctx);

  const row = await db.financeExpectedFinancialEvent.findUnique({
    where: { id: input.eventId },
  });
  if (!row) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_NOT_FOUND",
      "Expected financial event not found.",
      404,
    );
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Expected financial event");

  const account = await db.financialAccount.findUnique({
    where: { id: row.financialAccountId },
    select: { canonicalSemantic: true, tenantId: true },
  });
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");

  if (!(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_ACCOUNT",
      "Expected events must reference income or expense accounts.",
      400,
    );
  }

  let cutoffIso = input.actualsThroughDateIso?.trim() ?? null;
  if (!cutoffIso) {
    const forecast = await db.financeForecast.findUnique({
      where: {
        tenantId_financeYearId: {
          tenantId: ctx.tenantId,
          financeYearId: row.financeYearId,
        },
      },
      select: { currentVersionId: true },
    });
    if (forecast?.currentVersionId) {
      const version = await db.financeForecastVersion.findUnique({
        where: { id: forecast.currentVersionId },
        select: { actualsThroughDate: true },
      });
      if (version?.actualsThroughDate) {
        cutoffIso = formatFinanceCalendarDateIso(version.actualsThroughDate);
      }
    }
  }

  if (!cutoffIso) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF",
      "Actuals-through cutoff must be supplied explicitly when the current forecast version has none.",
      400,
    );
  }

  const mapped = mapExpectedFinancialEventRow(row);
  const temporalPositionAtCutoff = classifyExpectedEventTemporalPosition(cutoffIso, {
    expectedAmountMinor: mapped.expectedAmountMinor,
    timingPrecision: mapped.timingPrecision,
    expectedDateIso: mapped.expectedDateIso,
    expectedMonthStartIso: mapped.expectedMonthStartIso,
    rangeStartDateIso: mapped.rangeStartDateIso,
    rangeEndDateIso: mapped.rangeEndDateIso,
  });

  return {
    ...mapped,
    accountType: account.canonicalSemantic as "INCOME" | "EXPENSE",
    sourcePresentation: {
      sourceKind: mapped.sourceKind,
      isManual: mapped.sourceKind === "MANUAL",
      hasExternalSourceReference:
        mapped.sourceRefType != null && mapped.sourceRefId != null,
    },
    temporalPositionAtCutoff,
  };
}

export { FINANCE_FORECAST_TIMING_FIN_04E_04_QUERY };
