import type { PrismaClient } from "@prisma/client";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { calculateFinanceScenario } from "@/lib/finance/forecast/calculate-finance-scenario";
import {
  buildFinanceScenarioPrimaryComparison,
  computeScenarioVsApprovedBudgetTotals,
  computeScenarioVsCurrentForecastComparison,
  resolveFinanceScenarioChangeFlags,
  resolveFinanceScenarioResultSummaryState,
} from "@/lib/finance/forecast/finance-scenario-comparison";
import {
  buildFinanceScenarioDrivers,
  selectTopFinanceScenarioDrivers,
} from "@/lib/finance/forecast/finance-scenario-drivers";
import type {
  FinanceScenarioAccountEffect,
  FinanceScenarioAccountPresentation,
  FinanceScenarioActorRef,
  FinanceScenarioBaselineFreshness,
  FinanceScenarioDetailReadModel,
  FinanceScenarioListItemReadModel,
  FinanceScenarioListReadModel,
  FinanceScenarioSourceForecastRef,
} from "@/lib/finance/forecast/finance-scenario-read-model";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import type { FinanceScenarioPlanningAccountSemantic } from "@/lib/finance/forecast/finance-scenario-calculation-types";
import { buildForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import type { ForecastVersionLineInput } from "@/lib/finance/forecast/forecast-revision-comparison";
import { resolveCanonicalCurrentForecastVersionByPointer } from "@/lib/finance/services/finance-forecast-service";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeScenario"
  | "financeScenarioBaselineLine"
  | "financeScenarioAssumption"
  | "financialAccount"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "user"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

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

async function loadActorsByUserId(
  db: Db,
  userIds: readonly (string | null | undefined)[],
): Promise<Map<string, FinanceScenarioActorRef>> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) {
    return new Map();
  }
  const users = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(
    users.map((user) => [
      user.id,
      { userId: user.id, displayName: formatActorDisplayName(user) },
    ]),
  );
}

async function loadPlanningAccountPresentation(
  db: Db,
  ctx: FinanceAuthContext,
): Promise<{
  byId: Map<string, FinanceScenarioAccountPresentation>;
  accountTypes: Map<string, "INCOME" | "EXPENSE">;
  accountOrder: string[];
}> {
  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      canonicalSemantic: true,
      lifecycle: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const byId = new Map<string, FinanceScenarioAccountPresentation>();
  const accountTypes = new Map<string, "INCOME" | "EXPENSE">();
  const accountOrder: string[] = [];

  for (const account of accounts) {
    if (!(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)) {
      continue;
    }
    const accountType = account.canonicalSemantic as "INCOME" | "EXPENSE";
    byId.set(account.id, {
      financialAccountId: account.id,
      name: account.name,
      accountType,
      code: null,
      lifecycle: account.lifecycle as "ACTIVE" | "ARCHIVED",
    });
    accountTypes.set(account.id, accountType);
    accountOrder.push(account.id);
  }

  return { byId, accountTypes, accountOrder };
}

type CurrentForecastResolution =
  | { kind: "UNAVAILABLE" }
  | {
      kind: "AVAILABLE";
      forecastId: string;
      currentVersionId: string;
      versionNumber: number;
      revisionLabel: string | null;
      revisionSource: string | null;
      asOfDate: Date | null;
      actualsThroughDate: Date | null;
      lines: ForecastVersionLineInput[];
      incomeMinor: number;
      expenseMinor: number;
      resultMinor: number;
    };

async function resolveCurrentForecastForFinanceYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<CurrentForecastResolution> {
  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true, tenantId: true, financeYearId: true },
  });
  if (!forecast?.currentVersionId) {
    return { kind: "UNAVAILABLE" };
  }

  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
  if (!currentVersion) {
    return { kind: "UNAVAILABLE" };
  }

  const accountRows = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true },
  });
  const semanticByAccount = new Map(accountRows.map((a) => [a.id, a.canonicalSemantic]));

  const lines: ForecastVersionLineInput[] = [];
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const line of currentVersion.lines) {
    const semantic = semanticByAccount.get(line.financialAccountId);
    if (semantic !== "INCOME" && semantic !== "EXPENSE") {
      continue;
    }
    const accountType = semantic as "INCOME" | "EXPENSE";
    lines.push({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
      accountType,
    });
    if (accountType === "INCOME") {
      incomeMinor += line.amountMinor;
    } else {
      expenseMinor += line.amountMinor;
    }
  }

  return {
    kind: "AVAILABLE",
    forecastId: forecast.id,
    currentVersionId: currentVersion.id,
    versionNumber: currentVersion.versionNumber,
    revisionLabel: currentVersion.revisionLabel,
    revisionSource: currentVersion.revisionSource,
    asOfDate: currentVersion.asOfDate,
    actualsThroughDate: currentVersion.actualsThroughDate,
    lines,
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
  };
}

function resolveBaselineFreshness(input: {
  sourceForecastVersionId: string;
  currentForecast: CurrentForecastResolution;
}): FinanceScenarioBaselineFreshness {
  if (input.currentForecast.kind === "UNAVAILABLE") {
    return {
      status: "CURRENT_FORECAST_UNAVAILABLE",
      sourceForecastVersionId: input.sourceForecastVersionId,
      currentForecastVersionId: null,
    };
  }
  if (input.sourceForecastVersionId === input.currentForecast.currentVersionId) {
    return {
      status: "CURRENT",
      sourceForecastVersionId: input.sourceForecastVersionId,
      currentForecastVersionId: input.currentForecast.currentVersionId,
    };
  }
  return {
    status: "OUTDATED",
    sourceForecastVersionId: input.sourceForecastVersionId,
    currentForecastVersionId: input.currentForecast.currentVersionId,
  };
}

async function loadSourceForecastRef(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    sourceForecastId: string;
    sourceForecastVersionId: string;
  },
): Promise<FinanceScenarioSourceForecastRef> {
  const version = await db.financeForecastVersion.findUnique({
    where: { id: input.sourceForecastVersionId },
    include: { forecast: { select: { id: true, tenantId: true } } },
  });
  if (!version || version.forecastId !== input.sourceForecastId) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Scenario baseline source not found.", 404);
  }
  assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");

  const isCurrentPointerMatch = await db.financeForecast.findUnique({
    where: { id: input.sourceForecastId },
    select: { currentVersionId: true },
  });

  return {
    forecastId: input.sourceForecastId,
    forecastVersionId: version.id,
    versionNumber: version.versionNumber,
    revisionLabel: version.revisionLabel,
    asOfDate: version.asOfDate ? formatFinanceCalendarDateIso(version.asOfDate) : null,
    actualsThroughDate: version.actualsThroughDate
      ? formatFinanceCalendarDateIso(version.actualsThroughDate)
      : null,
    presentation: buildForecastHistoryDisplayMetadata({
      revisionLabel: version.revisionLabel,
      revisionSource: version.revisionSource as ForecastRevisionSource | null,
      asOfDate: version.asOfDate,
      versionNumber: version.versionNumber,
      isCurrent: isCurrentPointerMatch?.currentVersionId === version.id,
    }),
  };
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

type ScenarioCalcBundle = {
  calculation: ReturnType<typeof calculateFinanceScenario>;
  assumptionCount: number;
};

function runScenarioCalculation(input: {
  scenarioId: string;
  tenantId: string;
  financeYearId: string;
  baselineLines: Array<{ financialAccountId: string; amountMinor: number }>;
  assumptions: Array<{
    financialAccountId: string;
    kind: ScenarioAssumptionKindV1;
    percentBasisPoints: number | null;
    amountMinorDelta: number | null;
    absoluteAmountMinor: number | null;
  }>;
  accountSemantics: Array<{
    financialAccountId: string;
    canonicalSemantic: FinanceScenarioPlanningAccountSemantic;
  }>;
}): ScenarioCalcBundle {
  const calculation = calculateFinanceScenario({
    scenarioId: input.scenarioId,
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    baselineLines: input.baselineLines,
    assumptions: input.assumptions,
    accountSemantics: input.accountSemantics,
  });
  return { calculation, assumptionCount: input.assumptions.length };
}

export type LoadFinanceScenarioListOptions = {
  includeArchived?: boolean;
};

export async function loadFinanceScenarioList(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
  options: LoadFinanceScenarioListOptions = {},
): Promise<FinanceScenarioListReadModel> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);

  const scenarios = await db.financeScenario.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });

  if (scenarios.length === 0) {
    return { financeYearId, items: [] };
  }

  const scenarioIds = scenarios.map((s) => s.id);
  const [baselineLines, assumptions, currentForecast, actorsById] = await Promise.all([
    db.financeScenarioBaselineLine.findMany({
      where: { scenarioId: { in: scenarioIds } },
    }),
    db.financeScenarioAssumption.findMany({
      where: { scenarioId: { in: scenarioIds } },
    }),
    resolveCurrentForecastForFinanceYear(db, ctx, financeYearId),
    loadActorsByUserId(
      db,
      scenarios.flatMap((s) => [s.createdByUserId, s.updatedByUserId]),
    ),
  ]);

  const baselineByScenario = new Map<string, typeof baselineLines>();
  for (const line of baselineLines) {
    const bucket = baselineByScenario.get(line.scenarioId) ?? [];
    bucket.push(line);
    baselineByScenario.set(line.scenarioId, bucket);
  }
  const assumptionsByScenario = new Map<string, typeof assumptions>();
  for (const assumption of assumptions) {
    const bucket = assumptionsByScenario.get(assumption.scenarioId) ?? [];
    bucket.push(assumption);
    assumptionsByScenario.set(assumption.scenarioId, bucket);
  }

  const accountIds = new Set<string>();
  for (const line of baselineLines) {
    accountIds.add(line.financialAccountId);
  }
  const accountRows = await db.financialAccount.findMany({
    where: { id: { in: [...accountIds] } },
    select: { id: true, tenantId: true, canonicalSemantic: true },
  });
  for (const account of accountRows) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  }
  const semantics = accountRows.map((account) => ({
    financialAccountId: account.id,
    canonicalSemantic: account.canonicalSemantic as FinanceScenarioPlanningAccountSemantic,
  }));

  const items: FinanceScenarioListItemReadModel[] = scenarios.map((scenario) => {
    const scenarioBaseline = baselineByScenario.get(scenario.id) ?? [];
    const scenarioAssumptions = assumptionsByScenario.get(scenario.id) ?? [];
    const { calculation } = runScenarioCalculation({
      scenarioId: scenario.id,
      tenantId: scenario.tenantId,
      financeYearId: scenario.financeYearId,
      baselineLines: scenarioBaseline.map((line) => ({
        financialAccountId: line.financialAccountId,
        amountMinor: line.amountMinor,
      })),
      assumptions: scenarioAssumptions.map((assumption) => ({
        financialAccountId: assumption.financialAccountId,
        kind: assumption.kind as ScenarioAssumptionKindV1,
        percentBasisPoints: assumption.percentBasisPoints,
        amountMinorDelta: assumption.amountMinorDelta,
        absoluteAmountMinor: assumption.absoluteAmountMinor,
      })),
      accountSemantics: semantics.filter((row) =>
        scenarioBaseline.some((line) => line.financialAccountId === row.financialAccountId),
      ),
    });

    const baselineFreshness = resolveBaselineFreshness({
      sourceForecastVersionId: scenario.sourceForecastVersionId,
      currentForecast,
    });
    const changeFlags = resolveFinanceScenarioChangeFlags({
      totals: calculation.totals,
      accountResults: calculation.accountResults,
    });

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      isArchived: scenario.archivedAt != null,
      archivedAt: scenario.archivedAt ? scenario.archivedAt.toISOString() : null,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
      createdBy: scenario.createdByUserId
        ? (actorsById.get(scenario.createdByUserId) ?? null)
        : null,
      updatedBy: scenario.updatedByUserId
        ? (actorsById.get(scenario.updatedByUserId) ?? null)
        : null,
      sourceForecastVersionId: scenario.sourceForecastVersionId,
      baselineAsOfDate: scenario.baselineAsOfDate
        ? formatFinanceCalendarDateIso(scenario.baselineAsOfDate)
        : null,
      baselineActualsThroughDate: scenario.baselineActualsThroughDate
        ? formatFinanceCalendarDateIso(scenario.baselineActualsThroughDate)
        : null,
      baselineFreshness,
      assumptionCount: scenarioAssumptions.length,
      baselineResultMinor: calculation.totals.baselineResultMinor,
      scenarioResultMinor: calculation.totals.resultMinor,
      resultDeltaMinor: calculation.totals.resultDeltaMinor,
      summaryState: resolveFinanceScenarioResultSummaryState({
        assumptionCount: scenarioAssumptions.length,
        changeFlags,
      }),
    };
  });

  return { financeYearId, items };
}

export async function loadFinanceScenarioDetail(
  db: Db,
  ctx: FinanceAuthContext,
  input: { financeYearId: string; scenarioId: string },
): Promise<FinanceScenarioDetailReadModel> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  const loadScenarioRow = () =>
    db.financeScenario.findUnique({
      where: { id: input.scenarioId },
      include: {
        baselineLines: true,
        assumptions: true,
      },
    });

  const scenarioRow = db.$transaction
    ? await db.$transaction(async (tx) =>
        (tx as Db).financeScenario.findUnique({
          where: { id: input.scenarioId },
          include: {
            baselineLines: true,
            assumptions: true,
          },
        }),
      )
    : await loadScenarioRow();

  if (!scenarioRow) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  if (scenarioRow.financeYearId !== input.financeYearId) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  assertSameTenant(scenarioRow.tenantId, ctx.tenantId, "Scenario");

  const accountIds = scenarioRow.baselineLines.map((line) => line.financialAccountId);
  const [accountPresentation, accountSemanticsRows, sourceForecast, currentForecast, approvedBaseline, actorsById] =
    await Promise.all([
      loadPlanningAccountPresentation(db, ctx),
      db.financialAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, tenantId: true, canonicalSemantic: true },
      }),
      loadSourceForecastRef(db, ctx, {
        sourceForecastId: scenarioRow.sourceForecastId,
        sourceForecastVersionId: scenarioRow.sourceForecastVersionId,
      }),
      resolveCurrentForecastForFinanceYear(db, ctx, input.financeYearId),
      loadGovernanceApprovedBudgetBaseline(db, ctx, input.financeYearId),
      loadActorsByUserId(db, [scenarioRow.createdByUserId, scenarioRow.updatedByUserId]),
    ]);

  for (const account of accountSemanticsRows) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  }

  const { calculation } = runScenarioCalculation({
    scenarioId: scenarioRow.id,
    tenantId: scenarioRow.tenantId,
    financeYearId: scenarioRow.financeYearId,
    baselineLines: scenarioRow.baselineLines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    })),
    assumptions: scenarioRow.assumptions.map((assumption) => ({
      financialAccountId: assumption.financialAccountId,
      kind: assumption.kind as ScenarioAssumptionKindV1,
      percentBasisPoints: assumption.percentBasisPoints,
      amountMinorDelta: assumption.amountMinorDelta,
      absoluteAmountMinor: assumption.absoluteAmountMinor,
    })),
    accountSemantics: accountSemanticsRows.map((account) => ({
      financialAccountId: account.id,
      canonicalSemantic: account.canonicalSemantic as FinanceScenarioPlanningAccountSemantic,
    })),
  });

  const assumptionKindByAccountId = new Map(
    scenarioRow.assumptions.map((assumption) => [
      assumption.financialAccountId,
      assumption.kind as ScenarioAssumptionKindV1,
    ]),
  );

  const allDrivers = buildFinanceScenarioDrivers({
    assumptionEffects: calculation.assumptionEffects,
    accountPresentationById: accountPresentation.byId,
    assumptionKindByAccountId,
  });
  const topDrivers = selectTopFinanceScenarioDrivers(allDrivers);

  const accountEffects: FinanceScenarioAccountEffect[] = calculation.accountResults.flatMap(
    (row) => {
      const account = accountPresentation.byId.get(row.financialAccountId);
      if (!account) {
        return [];
      }
      return [
        {
          financialAccountId: row.financialAccountId,
          account,
          accountType: row.accountType,
          baselineAmountMinor: row.baselineAmountMinor,
          scenarioAmountMinor: row.scenarioAmountMinor,
          deltaMinor: row.deltaMinor,
          assumptionKind: row.assumptionKind,
          assumptionApplied: row.assumptionApplied,
          resultContributionMinor: row.resultContributionMinor,
        },
      ];
    },
  );

  const primary = buildFinanceScenarioPrimaryComparison(calculation.totals);
  const baselineFreshness = resolveBaselineFreshness({
    sourceForecastVersionId: scenarioRow.sourceForecastVersionId,
    currentForecast,
  });
  const changeFlags = resolveFinanceScenarioChangeFlags({
    totals: calculation.totals,
    accountResults: calculation.accountResults,
  });
  const summaryState = resolveFinanceScenarioResultSummaryState({
    assumptionCount: scenarioRow.assumptions.length,
    changeFlags,
  });

  const currentForecastContext =
    currentForecast.kind === "UNAVAILABLE"
      ? { kind: "UNAVAILABLE" as const }
      : {
          kind: "AVAILABLE" as const,
          forecastId: currentForecast.forecastId,
          forecastVersionId: currentForecast.currentVersionId,
          versionNumber: currentForecast.versionNumber,
          revisionLabel: currentForecast.revisionLabel,
          asOfDate: currentForecast.asOfDate
            ? formatFinanceCalendarDateIso(currentForecast.asOfDate)
            : null,
          actualsThroughDate: currentForecast.actualsThroughDate
            ? formatFinanceCalendarDateIso(currentForecast.actualsThroughDate)
            : null,
          presentation: buildForecastHistoryDisplayMetadata({
            revisionLabel: currentForecast.revisionLabel,
            revisionSource: currentForecast.revisionSource as ForecastRevisionSource | null,
            asOfDate: currentForecast.asOfDate,
            versionNumber: currentForecast.versionNumber,
            isCurrent: true,
          }),
          resultMinor: currentForecast.resultMinor,
          incomeMinor: currentForecast.incomeMinor,
          expenseMinor: currentForecast.expenseMinor,
        };

  const liveCurrentForecast =
    currentForecast.kind === "UNAVAILABLE"
      ? {
          kind: "UNAVAILABLE" as const,
          reason: "NO_CURRENT_FORECAST" as const,
        }
      : (() => {
          const live = computeScenarioVsCurrentForecastComparison({
            scenarioAccountResults: calculation.accountResults,
            currentForecastLines: currentForecast.lines,
            accountTypes: accountPresentation.accountTypes,
            accountOrder: accountPresentation.accountOrder,
          });
          return {
            kind: "AVAILABLE" as const,
            currentForecastVersionId: currentForecast.currentVersionId,
            ...live.summary,
            accountComparisons: live.accountComparisons,
          };
        })();

  const approvedBudget = (() => {
    if (!approvedBaseline) {
      return { kind: "NO_APPROVED_BUDGET" as const };
    }
    const budgetLines: ForecastVersionLineInput[] = approvedBaseline.lines
      .map((line) => {
        const accountType = accountPresentation.accountTypes.get(line.financialAccountId);
        if (!accountType) {
          return null;
        }
        return {
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
          accountType,
        };
      })
      .filter((row): row is ForecastVersionLineInput => row !== null);

    const totals = computeScenarioVsApprovedBudgetTotals({
      scenarioTotals: calculation.totals,
      approvedBudgetLines: budgetLines,
    });

    return {
      kind: "AVAILABLE" as const,
      approvedBudgetVersionId: approvedBaseline.id,
      approvedBudgetVersionNumber: approvedBaseline.versionNumber,
      ...totals,
    };
  })();

  return {
    scenarioId: scenarioRow.id,
    financeYearId: scenarioRow.financeYearId,
    tenantId: scenarioRow.tenantId,
    name: scenarioRow.name,
    description: scenarioRow.description,
    isArchived: scenarioRow.archivedAt != null,
    archivedAt: scenarioRow.archivedAt ? scenarioRow.archivedAt.toISOString() : null,
    createdAt: scenarioRow.createdAt.toISOString(),
    updatedAt: scenarioRow.updatedAt.toISOString(),
    createdBy: scenarioRow.createdByUserId
      ? (actorsById.get(scenarioRow.createdByUserId) ?? null)
      : null,
    updatedBy: scenarioRow.updatedByUserId
      ? (actorsById.get(scenarioRow.updatedByUserId) ?? null)
      : null,
    assumptions: scenarioRow.assumptions.map((assumption) => ({
      assumptionId: assumption.id,
      financialAccountId: assumption.financialAccountId,
      kind: assumption.kind as ScenarioAssumptionKindV1,
      percentBasisPoints: assumption.percentBasisPoints,
      amountMinorDelta: assumption.amountMinorDelta,
      absoluteAmountMinor: assumption.absoluteAmountMinor,
      note: assumption.note,
    })),
    assumptionCount: scenarioRow.assumptions.length,
    calculation,
    comparison: {
      primary,
      baselineFreshness,
      sourceForecast,
      currentForecast: currentForecastContext,
      liveCurrentForecast,
      approvedBudget,
      summaryState,
      changeFlags,
    },
    topDrivers,
    allDrivers,
    accountEffects,
  };
}
