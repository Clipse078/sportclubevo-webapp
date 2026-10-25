import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { executeForecastVersionSnapshotTransition } from "@/lib/finance/forecast/forecast-version-snapshot-transition";
import { FIN_04D_SCENARIO_ADOPTION_REVISION_SOURCE } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  buildScenarioAdoptionPreview,
  type ScenarioAdoptionPreviewResult,
} from "@/lib/finance/forecast/scenario-adoption-policy";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
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
  | "financeScenarioAdoption"
  | "financeActualEntry"
  | "financeExpectedFinancialEvent"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financialAccount"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type ScenarioAdoptionPreviewContext = ScenarioAdoptionPreviewResult & {
  scenarioId: string;
  scenarioName: string;
  baselineOutdated: boolean;
  expectedCurrentForecastVersionId: string;
  expectedScenarioUpdatedAt: string;
  canAdopt: boolean;
  temporalAdoptionBlocked: boolean;
};

async function loadScenarioAdoptionContext(
  db: Db,
  ctx: FinanceAuthContext,
  scenarioId: string,
): Promise<{
  scenario: Awaited<ReturnType<typeof db.financeScenario.findUnique>> & {
    baselineLines: Array<{ financialAccountId: string }>;
  };
  forecast: { id: string; currentVersionId: string | null };
  currentVersion: NonNullable<
    Awaited<ReturnType<typeof resolveCanonicalCurrentForecastVersionByPointer>>
  >;
  calculation: Awaited<ReturnType<typeof calculatePersistedFinanceScenario>>;
  accounts: Array<{
    accountId: string;
    semantic: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
}> {
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
      "No current forecast available for adoption.",
      409,
    );
  }

  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
  if (!currentVersion) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NO_CURRENT_FORECAST",
      "No current forecast available for adoption.",
      409,
    );
  }

  const calculation = await calculatePersistedFinanceScenario(db, ctx, { scenarioId });

  const baselineAccountIds = scenario.baselineLines.map((line) => line.financialAccountId);
  const accountRows = await db.financialAccount.findMany({
    where: { id: { in: baselineAccountIds } },
    select: { id: true, tenantId: true, canonicalSemantic: true, lifecycle: true },
  });
  if (accountRows.length !== baselineAccountIds.length) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ADOPTION_INVALID_ACCOUNT",
      "Scenario references an account that is no longer available.",
      409,
    );
  }
  for (const account of accountRows) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
    if (!(PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(account.canonicalSemantic)) {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_ADOPTION_INVALID_ACCOUNT",
        "Scenario references an account that is no longer available.",
        409,
      );
    }
  }

  const currentLineAccountIds = currentVersion.lines.map((line) => line.financialAccountId);
  const allAccountIds = [...new Set([...baselineAccountIds, ...currentLineAccountIds])];
  const allAccounts = await db.financialAccount.findMany({
    where: { id: { in: allAccountIds } },
    select: { id: true, tenantId: true, canonicalSemantic: true, lifecycle: true },
  });
  for (const account of allAccounts) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  }

  const accounts = allAccounts
    .filter(
      (row) =>
        (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(row.canonicalSemantic) &&
        (row.lifecycle === "ACTIVE" || row.lifecycle === "ARCHIVED"),
    )
    .map((row) => ({
      accountId: row.id,
      semantic: row.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: row.lifecycle as "ACTIVE" | "ARCHIVED",
    }));

  return {
    scenario,
    forecast,
    currentVersion,
    calculation,
    accounts,
  };
}

function buildPreviewFromContext(
  loaded: Awaited<ReturnType<typeof loadScenarioAdoptionContext>>,
): ScenarioAdoptionPreviewResult {
  const scenarioAmountByAccountId = new Map(
    loaded.calculation.accountResults.map((row) => [
      row.financialAccountId,
      row.scenarioAmountMinor,
    ]),
  );
  const currentForecastAmountByAccountId = new Map(
    loaded.currentVersion.lines.map((line) => [line.financialAccountId, line.amountMinor]),
  );
  const scenarioBaselineAccountIds = new Set(
    loaded.scenario.baselineLines.map((line) => line.financialAccountId),
  );

  return buildScenarioAdoptionPreview({
    sourceForecastVersionId: loaded.currentVersion.id,
    scenarioBaselineAccountIds,
    scenarioAmountByAccountId,
    currentForecastAmountByAccountId,
    accounts: loaded.accounts,
  });
}

export async function previewFinanceScenarioAdoption(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string },
): Promise<ScenarioAdoptionPreviewContext> {
  requireFinanceForecastView(ctx);
  const loaded = await loadScenarioAdoptionContext(db, ctx, input.scenarioId);

  const preview = buildPreviewFromContext(loaded);
  const baselineOutdated =
    loaded.scenario.sourceForecastVersionId !== loaded.currentVersion.id;

  const temporalAdoptionEligible = loaded.calculation.temporal.adoptionEligible;
  const temporalStale = loaded.calculation.temporal.temporalStale;

  return {
    ...preview,
    scenarioId: loaded.scenario.id,
    scenarioName: loaded.scenario.name,
    baselineOutdated,
    expectedCurrentForecastVersionId: loaded.currentVersion.id,
    expectedScenarioUpdatedAt: loaded.scenario.updatedAt.toISOString(),
    canAdopt:
      !loaded.scenario.archivedAt && temporalAdoptionEligible && !temporalStale,
    temporalAdoptionBlocked:
      !temporalAdoptionEligible || temporalStale,
  };
}

export type AdoptFinanceScenarioResult = {
  adoptionId: string;
  targetForecastVersionId: string;
  targetVersionNumber: number;
};

function parseExpectedUpdatedAt(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new FinanceDomainError("FINANCE_SCENARIO_STALE", "Invalid scenario timestamp.", 400);
  }
  return parsed;
}

export async function adoptFinanceScenarioToCurrentForecast(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedScenarioUpdatedAt: Date | string;
    expectedCurrentForecastVersionId: string;
  },
): Promise<AdoptFinanceScenarioResult> {
  requireFinanceForecastManage(ctx);
  if (!ctx.userId) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "User context required.", 403);
  }

  const expectedScenarioUpdatedAt = parseExpectedUpdatedAt(input.expectedScenarioUpdatedAt);
  const loaded = await loadScenarioAdoptionContext(db, ctx, input.scenarioId);

  if (loaded.scenario.archivedAt) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ARCHIVED",
      "Archived scenarios cannot be adopted.",
      409,
    );
  }

  if (loaded.scenario.updatedAt.getTime() !== expectedScenarioUpdatedAt.getTime()) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE",
      "This scenario was changed. Refresh and try again.",
      409,
    );
  }

  if (loaded.currentVersion.id !== input.expectedCurrentForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE_CURRENT_FORECAST",
      "The current forecast was changed. Refresh and try again.",
      409,
    );
  }

  const preview = buildPreviewFromContext(loaded);
  for (const line of preview.persistableLines) {
    assertSafeAmountMinor(line.amountMinor);
  }

  if (!loaded.calculation.temporal.adoptionEligible) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ADOPTION_PARTIAL_TEMPORAL_COVERAGE",
      "Scenario adoption requires complete temporal coverage for effective-dated assumptions.",
      409,
    );
  }
  if (loaded.calculation.temporal.temporalStale) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ADOPTION_TEMPORAL_STALE",
      "Expected timing evidence changed since this scenario was last saved. Refresh and review before adoption.",
      409,
    );
  }

  const revisionLabel = `Variante: ${loaded.scenario.name}`.slice(0, 200);

  const run = async (tx: Db) => {
    const scenarioRow = await tx.financeScenario.findUnique({
      where: { id: input.scenarioId },
    });
    if (!scenarioRow || scenarioRow.updatedAt.getTime() !== expectedScenarioUpdatedAt.getTime()) {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_STALE",
        "This scenario was changed. Refresh and try again.",
        409,
      );
    }

    const transition = await executeForecastVersionSnapshotTransition(tx, {
      forecastId: loaded.forecast.id,
      expectedCurrentForecastVersionId: input.expectedCurrentForecastVersionId,
      createdByUserId: ctx.userId,
      lineSnapshot: preview.persistableLines.map((line) => ({
        financialAccountId: line.financialAccountId,
        amountMinor: line.amountMinor,
      })),
      newVersionMetadata: {
        revisionSource: FIN_04D_SCENARIO_ADOPTION_REVISION_SOURCE,
        revisionLabel,
        revisionReason: "MANAGEMENT_DECISION",
        previousVersionId: loaded.currentVersion.id,
        asOfDate: loaded.currentVersion.asOfDate ?? null,
        actualsThroughDate: loaded.currentVersion.actualsThroughDate ?? null,
      },
    });

    const adoption = await tx.financeScenarioAdoption.create({
      data: {
        tenantId: ctx.tenantId,
        financeYearId: loaded.scenario.financeYearId,
        scenarioId: loaded.scenario.id,
        sourceScenarioUpdatedAt: scenarioRow.updatedAt,
        sourceForecastVersionId: input.expectedCurrentForecastVersionId,
        resultingForecastVersionId: transition.newCurrentVersionId,
        adoptedByUserId: ctx.userId!,
      },
    });

    return {
      adoptionId: adoption.id,
      targetForecastVersionId: transition.newCurrentVersionId,
      targetVersionNumber: transition.newVersionNumber,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}
