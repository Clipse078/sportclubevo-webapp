import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { calculateFinanceScenario } from "@/lib/finance/forecast/calculate-finance-scenario";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import type { FinanceScenarioPlanningAccountSemantic } from "@/lib/finance/forecast/finance-scenario-calculation-types";
import { mapForecastLinesForSnapshot } from "@/lib/finance/forecast/forecast-version-snapshot-transition";
import { calculatePersistedFinanceScenario } from "@/lib/finance/services/finance-scenario-service";
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
  | "financeScenarioRebase"
  | "financeActualEntry"
  | "financeExpectedFinancialEvent"
  | "financeScenarioAdoption"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financialAccount"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type ScenarioRebaseUnmappedAssumption = {
  financialAccountId: string;
  assumptionKind: ScenarioAssumptionKindV1;
};

export type ScenarioRebasePreviewContext = {
  scenarioId: string;
  assumptionCount: number;
  currentScenarioResultMinor: number;
  prospectiveScenarioResultMinor: number;
  resultDeltaMinor: number;
  baselineOutdated: boolean;
  expectedScenarioUpdatedAt: string;
  expectedCurrentForecastVersionId: string;
  canRebase: boolean;
  unmappedAssumptions: ScenarioRebaseUnmappedAssumption[];
};

function parseExpectedUpdatedAt(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new FinanceDomainError("FINANCE_SCENARIO_STALE", "Invalid scenario timestamp.", 400);
  }
  return parsed;
}

async function loadRebaseContext(db: Db, ctx: FinanceAuthContext, scenarioId: string) {
  const scenario = await db.financeScenario.findUnique({
    where: { id: scenarioId },
    include: { baselineLines: true, assumptions: true },
  });
  if (!scenario) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  assertSameTenant(scenario.tenantId, ctx.tenantId, "Scenario");

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: scenario.financeYearId } },
    select: { id: true, currentVersionId: true },
  });
  if (!forecast?.currentVersionId) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NO_CURRENT_FORECAST",
      "No current forecast available for rebase.",
      409,
    );
  }

  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
  if (!currentVersion) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NO_CURRENT_FORECAST",
      "No current forecast available for rebase.",
      409,
    );
  }

  const baselineOutdated = scenario.sourceForecastVersionId !== currentVersion.id;

  const accountIds = [
    ...new Set([
      ...scenario.baselineLines.map((line) => line.financialAccountId),
      ...currentVersion.lines.map((line) => line.financialAccountId),
      ...scenario.assumptions.map((assumption) => assumption.financialAccountId),
    ]),
  ];
  const accountRows = await db.financialAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, tenantId: true, canonicalSemantic: true },
  });
  for (const account of accountRows) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  }

  return { scenario, forecast, currentVersion, baselineOutdated, accountRows };
}

function validateAssumptionsAgainstBaseline(
  assumptions: Array<{ financialAccountId: string; kind: ScenarioAssumptionKindV1 }>,
  baselineAccountIds: ReadonlySet<string>,
): ScenarioRebaseUnmappedAssumption[] {
  const unmapped: ScenarioRebaseUnmappedAssumption[] = [];
  for (const assumption of assumptions) {
    if (!baselineAccountIds.has(assumption.financialAccountId)) {
      unmapped.push({
        financialAccountId: assumption.financialAccountId,
        assumptionKind: assumption.kind,
      });
    }
  }
  return unmapped.sort((a, b) => a.financialAccountId.localeCompare(b.financialAccountId));
}

async function computeProspectiveResult(
  db: Db,
  ctx: FinanceAuthContext,
  scenario: {
    id: string;
    tenantId: string;
    financeYearId: string;
    assumptions: Array<{
      financialAccountId: string;
      kind: string;
      percentBasisPoints: number | null;
      amountMinorDelta: number | null;
      absoluteAmountMinor: number | null;
    }>;
  },
  prospectiveBaseline: Array<{ financialAccountId: string; amountMinor: number }>,
  accountRows: Array<{ id: string; canonicalSemantic: string }>,
) {
  return calculateFinanceScenario({
    scenarioId: scenario.id,
    tenantId: scenario.tenantId,
    financeYearId: scenario.financeYearId,
    baselineLines: prospectiveBaseline,
    assumptions: scenario.assumptions.map((assumption) => ({
      financialAccountId: assumption.financialAccountId,
      kind: assumption.kind as ScenarioAssumptionKindV1,
      percentBasisPoints: assumption.percentBasisPoints,
      amountMinorDelta: assumption.amountMinorDelta,
      absoluteAmountMinor: assumption.absoluteAmountMinor,
    })),
    accountSemantics: accountRows
      .filter((row) =>
        (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(row.canonicalSemantic),
      )
      .map((row) => ({
        financialAccountId: row.id,
        canonicalSemantic: row.canonicalSemantic as FinanceScenarioPlanningAccountSemantic,
      })),
  });
}

export async function previewFinanceScenarioRebase(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string },
): Promise<ScenarioRebasePreviewContext> {
  requireFinanceForecastView(ctx);
  const loaded = await loadRebaseContext(db, ctx, input.scenarioId);
  const currentCalculation = await calculatePersistedFinanceScenario(db, ctx, {
    scenarioId: input.scenarioId,
  });

  const prospectiveBaseline = mapForecastLinesForSnapshot(
    loaded.currentVersion.lines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    })),
  );
  const baselineAccountIds = new Set(prospectiveBaseline.map((line) => line.financialAccountId));
  const unmappedAssumptions = validateAssumptionsAgainstBaseline(
    loaded.scenario.assumptions.map((assumption) => ({
      financialAccountId: assumption.financialAccountId,
      kind: assumption.kind as ScenarioAssumptionKindV1,
    })),
    baselineAccountIds,
  );

  let prospectiveScenarioResultMinor = currentCalculation.totals.resultMinor;
  if (unmappedAssumptions.length === 0 && loaded.baselineOutdated) {
    const prospective = await computeProspectiveResult(
      db,
      ctx,
      loaded.scenario,
      prospectiveBaseline,
      loaded.accountRows,
    );
    prospectiveScenarioResultMinor = prospective.totals.resultMinor;
  }

  return {
    scenarioId: loaded.scenario.id,
    assumptionCount: loaded.scenario.assumptions.length,
    currentScenarioResultMinor: currentCalculation.totals.resultMinor,
    prospectiveScenarioResultMinor,
    resultDeltaMinor: prospectiveScenarioResultMinor - currentCalculation.totals.resultMinor,
    baselineOutdated: loaded.baselineOutdated,
    expectedScenarioUpdatedAt: loaded.scenario.updatedAt.toISOString(),
    expectedCurrentForecastVersionId: loaded.currentVersion.id,
    canRebase:
      loaded.baselineOutdated &&
      !loaded.scenario.archivedAt &&
      unmappedAssumptions.length === 0,
    unmappedAssumptions,
  };
}

export type RebaseFinanceScenarioResult = {
  scenarioId: string;
  updatedAt: Date;
  rebaseId: string;
  sourceForecastVersionId: string;
};

export async function rebaseFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedScenarioUpdatedAt: Date | string;
    expectedCurrentForecastVersionId: string;
  },
): Promise<RebaseFinanceScenarioResult> {
  requireFinanceForecastManage(ctx);
  if (!ctx.userId) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "User context required.", 403);
  }

  const expectedScenarioUpdatedAt = parseExpectedUpdatedAt(input.expectedScenarioUpdatedAt);
  const preview = await previewFinanceScenarioRebase(db, ctx, { scenarioId: input.scenarioId });

  if (!preview.baselineOutdated) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_REBASE_NOT_OUTDATED",
      "Source forecast is already current.",
      409,
    );
  }

  if (preview.unmappedAssumptions.length > 0) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_REBASE_UNMAPPED_ASSUMPTIONS",
      "Some assumptions no longer map to the current forecast.",
      409,
    );
  }

  if (preview.expectedScenarioUpdatedAt !== expectedScenarioUpdatedAt.toISOString()) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE",
      "This scenario was changed. Refresh and try again.",
      409,
    );
  }

  if (preview.expectedCurrentForecastVersionId !== input.expectedCurrentForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE_CURRENT_FORECAST",
      "The current forecast was changed. Refresh and try again.",
      409,
    );
  }

  const loaded = await loadRebaseContext(db, ctx, input.scenarioId);
  if (loaded.scenario.archivedAt) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ARCHIVED",
      "Archived scenarios cannot be rebased.",
      409,
    );
  }

  const lineSnapshot = mapForecastLinesForSnapshot(
    loaded.currentVersion.lines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    })),
  );

  const run = async (tx: Db) => {
    const updated = await tx.financeScenario.updateMany({
      where: {
        id: loaded.scenario.id,
        tenantId: ctx.tenantId,
        updatedAt: expectedScenarioUpdatedAt,
        archivedAt: null,
      },
      data: {
        sourceForecastVersionId: loaded.currentVersion.id,
        baselineAsOfDate: loaded.currentVersion.asOfDate ?? null,
        baselineActualsThroughDate: loaded.currentVersion.actualsThroughDate ?? null,
        updatedByUserId: ctx.userId ?? null,
      },
    });
    if (updated.count === 0) {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_STALE",
        "This scenario was changed. Refresh and try again.",
        409,
      );
    }

    await tx.financeScenarioBaselineLine.deleteMany({
      where: { scenarioId: loaded.scenario.id },
    });

    if (lineSnapshot.length > 0) {
      await tx.financeScenarioBaselineLine.createMany({
        data: lineSnapshot.map((line) => ({
          scenarioId: loaded.scenario.id,
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
        })),
      });
    }

    const rebase = await tx.financeScenarioRebase.create({
      data: {
        tenantId: ctx.tenantId,
        scenarioId: loaded.scenario.id,
        fromForecastVersionId: loaded.scenario.sourceForecastVersionId,
        toForecastVersionId: loaded.currentVersion.id,
        rebasedByUserId: ctx.userId!,
      },
    });

    const fresh = await tx.financeScenario.findUniqueOrThrow({ where: { id: loaded.scenario.id } });
    return {
      scenarioId: fresh.id,
      updatedAt: fresh.updatedAt,
      rebaseId: rebase.id,
      sourceForecastVersionId: fresh.sourceForecastVersionId,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}
