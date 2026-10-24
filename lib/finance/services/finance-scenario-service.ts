import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  assertScenarioAssumptionAppliesToBaseline,
  validateScenarioAssumptionPayload,
  type ScenarioAssumptionPayloadInput,
} from "@/lib/finance/forecast/scenario-assumption-persistence-validation";
import {
  assertValidFinanceScenarioDescription,
  assertValidFinanceScenarioName,
  normalizedScenarioNameKey,
} from "@/lib/finance/forecast/scenario-metadata-validation";
import { calculateFinanceScenario } from "@/lib/finance/forecast/calculate-finance-scenario";
import {
  FinanceScenarioCalculationError,
  type FinanceScenarioCalculationErrorCode,
} from "@/lib/finance/forecast/finance-scenario-calculation-errors";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import type {
  FinanceScenarioCalculationResult,
  FinanceScenarioPlanningAccountSemantic,
} from "@/lib/finance/forecast/finance-scenario-calculation-types";
import { mapForecastLinesForSnapshot } from "@/lib/finance/forecast/forecast-version-snapshot-transition";
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
  | "financialAccount"
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

function mapMetadataValidationError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "FINANCE_SCENARIO_NAME_BLANK") {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_NAME_BLANK",
        "Scenario name is required.",
        400,
      );
    }
    if (error.message === "FINANCE_SCENARIO_NAME_TOO_LONG") {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_NAME_TOO_LONG",
        "Scenario name is too long.",
        400,
      );
    }
    if (error.message === "FINANCE_SCENARIO_DESCRIPTION_TOO_LONG") {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_DESCRIPTION_TOO_LONG",
        "Scenario description is too long.",
        400,
      );
    }
  }
  throw error;
}

function mapAssumptionValidationError(error: unknown): never {
  if (error instanceof Error && error.message === "FINANCE_SCENARIO_INVALID_ASSUMPTION") {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_INVALID_ASSUMPTION",
      "Invalid scenario assumption payload.",
      400,
    );
  }
  throw error;
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getScenarioOrThrow(db: Db, ctx: FinanceAuthContext, scenarioId: string) {
  const scenario = await db.financeScenario.findUnique({
    where: { id: scenarioId },
    include: {
      baselineLines: true,
      assumptions: true,
    },
  });
  if (!scenario) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  assertSameTenant(scenario.tenantId, ctx.tenantId, "Scenario");
  return scenario;
}

async function assertActiveScenarioForMutation(
  scenario: { archivedAt: Date | null },
): Promise<void> {
  if (scenario.archivedAt) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ARCHIVED",
      "Archived scenarios cannot be edited.",
      409,
    );
  }
}

async function getAccountForScenarioAssumptionOrThrow(
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
      "FINANCE_SCENARIO_ACCOUNT_NOT_AVAILABLE",
      "Scenario assumptions must reference income or expense accounts.",
      400,
    );
  }
  if (account.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_ACCOUNT_NOT_AVAILABLE",
      "Archived accounts cannot receive new scenario assumptions.",
      409,
    );
  }
  return account;
}

function parseExpectedUpdatedAt(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new FinanceDomainError("FINANCE_SCENARIO_STALE", "Invalid concurrency token.", 409);
  }
  return parsed;
}

async function resolveStaleScenarioOutcome(
  db: Db,
  ctx: FinanceAuthContext,
  scenarioId: string,
  expectedUpdatedAt: Date,
): Promise<never> {
  const current = await db.financeScenario.findUnique({ where: { id: scenarioId } });
  if (!current || current.tenantId !== ctx.tenantId) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE",
      "The scenario changed. Refresh and try again.",
      409,
    );
  }
  throw new FinanceDomainError(
    "FINANCE_SCENARIO_ARCHIVED",
    "Archived scenarios cannot be edited.",
    409,
  );
}

async function touchScenarioWithConcurrency(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedUpdatedAt: Date | string;
    requireActive: boolean;
    patch?: { name?: string; description?: string | null; archivedAt?: Date | null };
  },
) {
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
  const where: {
    id: string;
    tenantId: string;
    updatedAt: Date;
    archivedAt?: null;
  } = {
    id: input.scenarioId,
    tenantId: ctx.tenantId,
    updatedAt: expectedUpdatedAt,
  };
  if (input.requireActive) {
    where.archivedAt = null;
  }

  const data: {
    updatedByUserId: string | null;
    name?: string;
    description?: string | null;
    archivedAt?: Date | null;
  } = {
    updatedByUserId: ctx.userId ?? null,
  };
  if (input.patch?.name !== undefined) data.name = input.patch.name;
  if (input.patch?.description !== undefined) data.description = input.patch.description;
  if (input.patch?.archivedAt !== undefined) data.archivedAt = input.patch.archivedAt;

  const result = await db.financeScenario.updateMany({ where, data });
  if (result.count === 0) {
    return resolveStaleScenarioOutcome(db, ctx, input.scenarioId, expectedUpdatedAt);
  }
  return db.financeScenario.findUniqueOrThrow({ where: { id: input.scenarioId } });
}

async function assertNoActiveNameConflict(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
  name: string,
  excludeScenarioId?: string,
) {
  const key = normalizedScenarioNameKey(name);
  const active = await db.financeScenario.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId,
      archivedAt: null,
      ...(excludeScenarioId ? { NOT: { id: excludeScenarioId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (active.some((row) => normalizedScenarioNameKey(row.name) === key)) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NAME_CONFLICT",
      "An active scenario with this name already exists for the financial year.",
      409,
    );
  }
}

async function resolveCurrentForecastSnapshotContext(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
  expectedCurrentForecastVersionId?: string | null,
) {
  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true, currentVersionId: true, tenantId: true, financeYearId: true },
  });
  if (!forecast?.currentVersionId) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NO_CURRENT_FORECAST",
      "A current forecast is required before creating a scenario.",
      409,
    );
  }

  const currentVersion = await db.financeForecastVersion.findUnique({
    where: { id: forecast.currentVersionId },
    include: {
      lines: true,
      forecast: { select: { id: true, tenantId: true, financeYearId: true } },
    },
  });
  if (!currentVersion || currentVersion.forecastId !== forecast.id) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_NO_CURRENT_FORECAST",
      "A current forecast is required before creating a scenario.",
      409,
    );
  }
  assertSameTenant(currentVersion.forecast.tenantId, ctx.tenantId, "Forecast");

  if (
    expectedCurrentForecastVersionId &&
    expectedCurrentForecastVersionId !== currentVersion.id
  ) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_STALE_CURRENT_FORECAST",
      "The current forecast version changed. Refresh and try again.",
      409,
    );
  }

  if (currentVersion.forecastId !== forecast.id || forecast.financeYearId !== financeYearId) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast context invalid.", 404);
  }

  return { forecast, currentVersion };
}

export type FinanceScenarioIdentityResult = {
  scenarioId: string;
  financeYearId: string;
  sourceForecastVersionId: string;
  baselineLineCount: number;
  updatedAt: Date;
};

export async function createFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    name: string;
    description?: string | null;
    expectedCurrentForecastVersionId?: string | null;
    initialAssumptions?: Array<
      ScenarioAssumptionPayloadInput & { financialAccountId: string }
    >;
  },
): Promise<FinanceScenarioIdentityResult> {
  requireFinanceForecastManage(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  let name: string;
  let description: string | null;
  try {
    name = assertValidFinanceScenarioName(input.name);
    description = assertValidFinanceScenarioDescription(input.description);
  } catch (error) {
    mapMetadataValidationError(error);
  }

  await assertNoActiveNameConflict(db, ctx, input.financeYearId, name);

  const { forecast, currentVersion } = await resolveCurrentForecastSnapshotContext(
    db,
    ctx,
    input.financeYearId,
    input.expectedCurrentForecastVersionId,
  );

  const lineSnapshot = mapForecastLinesForSnapshot(
    currentVersion.lines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    })),
  );

  const validatedInitialAssumptions: Array<{
    financialAccountId: string;
    payload: ReturnType<typeof validateScenarioAssumptionPayload>;
  }> = [];

  if (input.initialAssumptions?.length) {
    const baselineByAccount = new Map(
      lineSnapshot.map((line) => [line.financialAccountId, line.amountMinor]),
    );
    for (const assumption of input.initialAssumptions) {
      await getAccountForScenarioAssumptionOrThrow(db, ctx, assumption.financialAccountId);
      let payload;
      try {
        payload = validateScenarioAssumptionPayload(assumption);
      } catch (error) {
        mapAssumptionValidationError(error);
      }
      const baselineAmountMinor = baselineByAccount.get(assumption.financialAccountId) ?? null;
      try {
        assertScenarioAssumptionAppliesToBaseline(baselineAmountMinor, payload);
      } catch (error) {
        mapAssumptionValidationError(error);
      }
      validatedInitialAssumptions.push({
        financialAccountId: assumption.financialAccountId,
        payload,
      });
    }
  }

  const run = async (tx: Db) => {
    let scenario;
    try {
      scenario = await tx.financeScenario.create({
        data: {
          tenantId: ctx.tenantId,
          financeYearId: input.financeYearId,
          name,
          description,
          sourceForecastId: forecast.id,
          sourceForecastVersionId: currentVersion.id,
          baselineAsOfDate: currentVersion.asOfDate ?? null,
          baselineActualsThroughDate: currentVersion.actualsThroughDate ?? null,
          createdByUserId: ctx.userId ?? null,
          updatedByUserId: ctx.userId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new FinanceDomainError(
          "FINANCE_SCENARIO_NAME_CONFLICT",
          "An active scenario with this name already exists for the financial year.",
          409,
        );
      }
      throw error;
    }

    if (lineSnapshot.length > 0) {
      await tx.financeScenarioBaselineLine.createMany({
        data: lineSnapshot.map((line) => ({
          scenarioId: scenario.id,
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
        })),
      });
    }

    for (const assumption of validatedInitialAssumptions) {
      await tx.financeScenarioAssumption.create({
        data: {
          scenarioId: scenario.id,
          financialAccountId: assumption.financialAccountId,
          kind: assumption.payload.kind,
          percentBasisPoints: assumption.payload.percentBasisPoints,
          amountMinorDelta: assumption.payload.amountMinorDelta,
          absoluteAmountMinor: assumption.payload.absoluteAmountMinor,
          note: assumption.payload.note,
        },
      });
    }

    const fresh = await tx.financeScenario.findUniqueOrThrow({ where: { id: scenario.id } });
    return {
      scenarioId: fresh.id,
      financeYearId: fresh.financeYearId,
      sourceForecastVersionId: fresh.sourceForecastVersionId,
      baselineLineCount: lineSnapshot.length,
      updatedAt: fresh.updatedAt,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

export async function updateFinanceScenarioMetadata(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedUpdatedAt: Date | string;
    name?: string;
    description?: string | null;
  },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  await assertActiveScenarioForMutation(scenario);

  const patch: { name?: string; description?: string | null } = {};
  if (input.name !== undefined) {
    try {
      patch.name = assertValidFinanceScenarioName(input.name);
    } catch (error) {
      mapMetadataValidationError(error);
    }
    if (patch.name !== scenario.name) {
      await assertNoActiveNameConflict(db, ctx, scenario.financeYearId, patch.name, scenario.id);
    }
  }
  if (input.description !== undefined) {
    try {
      patch.description = assertValidFinanceScenarioDescription(input.description);
    } catch (error) {
      mapMetadataValidationError(error);
    }
  }

  try {
    return await touchScenarioWithConcurrency(db, ctx, {
      scenarioId: scenario.id,
      expectedUpdatedAt: input.expectedUpdatedAt,
      requireActive: true,
      patch,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new FinanceDomainError(
        "FINANCE_SCENARIO_NAME_CONFLICT",
        "An active scenario with this name already exists for the financial year.",
        409,
      );
    }
    throw error;
  }
}

export async function upsertFinanceScenarioAssumption(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedUpdatedAt: Date | string;
    financialAccountId: string;
    assumption: ScenarioAssumptionPayloadInput;
  },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  await assertActiveScenarioForMutation(scenario);
  await getAccountForScenarioAssumptionOrThrow(db, ctx, input.financialAccountId);

  let payload;
  try {
    payload = validateScenarioAssumptionPayload(input.assumption);
  } catch (error) {
    mapAssumptionValidationError(error);
  }

  const baselineLine = scenario.baselineLines.find(
    (line) => line.financialAccountId === input.financialAccountId,
  );
  const baselineAmountMinor = baselineLine?.amountMinor ?? null;
  try {
    assertScenarioAssumptionAppliesToBaseline(baselineAmountMinor, payload);
  } catch (error) {
    mapAssumptionValidationError(error);
  }

  const run = async (tx: Db) => {
    await touchScenarioWithConcurrency(tx, ctx, {
      scenarioId: scenario.id,
      expectedUpdatedAt: input.expectedUpdatedAt,
      requireActive: true,
    });

    return tx.financeScenarioAssumption.upsert({
      where: {
        scenarioId_financialAccountId: {
          scenarioId: scenario.id,
          financialAccountId: input.financialAccountId,
        },
      },
      create: {
        scenarioId: scenario.id,
        financialAccountId: input.financialAccountId,
        kind: payload.kind,
        percentBasisPoints: payload.percentBasisPoints,
        amountMinorDelta: payload.amountMinorDelta,
        absoluteAmountMinor: payload.absoluteAmountMinor,
        note: payload.note,
      },
      update: {
        kind: payload.kind,
        percentBasisPoints: payload.percentBasisPoints,
        amountMinorDelta: payload.amountMinorDelta,
        absoluteAmountMinor: payload.absoluteAmountMinor,
        note: payload.note,
      },
    });
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

export async function removeFinanceScenarioAssumption(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    expectedUpdatedAt: Date | string;
    financialAccountId: string;
  },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  await assertActiveScenarioForMutation(scenario);

  const run = async (tx: Db) => {
    await touchScenarioWithConcurrency(tx, ctx, {
      scenarioId: scenario.id,
      expectedUpdatedAt: input.expectedUpdatedAt,
      requireActive: true,
    });

    const existing = await tx.financeScenarioAssumption.findUnique({
      where: {
        scenarioId_financialAccountId: {
          scenarioId: scenario.id,
          financialAccountId: input.financialAccountId,
        },
      },
    });
    if (existing) {
      await tx.financeScenarioAssumption.delete({ where: { id: existing.id } });
    }
    return { removed: Boolean(existing) };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

export async function archiveFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string; expectedUpdatedAt: Date | string },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  if (scenario.archivedAt) {
    return scenario;
  }
  return touchScenarioWithConcurrency(db, ctx, {
    scenarioId: scenario.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    requireActive: true,
    patch: { archivedAt: new Date() },
  });
}

export async function restoreFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string; expectedUpdatedAt: Date | string },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  if (!scenario.archivedAt) {
    return scenario;
  }

  await assertNoActiveNameConflict(db, ctx, scenario.financeYearId, scenario.name, scenario.id);

  return touchScenarioWithConcurrency(db, ctx, {
    scenarioId: scenario.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    requireActive: false,
    patch: { archivedAt: null },
  });
}

export async function deleteFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string; expectedUpdatedAt: Date | string },
) {
  requireFinanceForecastManage(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);

  const adoptionCount = await db.financeScenarioAdoption.count({
    where: { scenarioId: scenario.id, tenantId: ctx.tenantId },
  });
  if (adoptionCount > 0) {
    throw new FinanceDomainError(
      "FINANCE_SCENARIO_DELETE_BLOCKED_ADOPTION",
      "This scenario cannot be deleted because it was adopted as the current forecast.",
      409,
    );
  }

  const deleted = await db.financeScenario.deleteMany({
    where: {
      id: scenario.id,
      tenantId: ctx.tenantId,
      updatedAt: expectedUpdatedAt,
    },
  });
  if (deleted.count === 0) {
    return resolveStaleScenarioOutcome(db, ctx, scenario.id, expectedUpdatedAt);
  }
  return { deleted: true as const };
}

export async function duplicateFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    sourceScenarioId: string;
    name: string;
    description?: string | null;
  },
): Promise<FinanceScenarioIdentityResult> {
  requireFinanceForecastManage(ctx);
  const source = await getScenarioOrThrow(db, ctx, input.sourceScenarioId);

  let name: string;
  let description: string | null;
  try {
    name = assertValidFinanceScenarioName(input.name);
    description =
      input.description !== undefined
        ? assertValidFinanceScenarioDescription(input.description)
        : source.description;
  } catch (error) {
    mapMetadataValidationError(error);
  }

  await assertNoActiveNameConflict(db, ctx, source.financeYearId, name);

  const run = async (tx: Db) => {
    let scenario;
    try {
      scenario = await tx.financeScenario.create({
        data: {
          tenantId: source.tenantId,
          financeYearId: source.financeYearId,
          name,
          description,
          sourceForecastId: source.sourceForecastId,
          sourceForecastVersionId: source.sourceForecastVersionId,
          baselineAsOfDate: source.baselineAsOfDate,
          baselineActualsThroughDate: source.baselineActualsThroughDate,
          createdByUserId: ctx.userId ?? null,
          updatedByUserId: ctx.userId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new FinanceDomainError(
          "FINANCE_SCENARIO_NAME_CONFLICT",
          "An active scenario with this name already exists for the financial year.",
          409,
        );
      }
      throw error;
    }

    if (source.baselineLines.length > 0) {
      await tx.financeScenarioBaselineLine.createMany({
        data: source.baselineLines.map((line) => ({
          scenarioId: scenario.id,
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
        })),
      });
    }

    if (source.assumptions.length > 0) {
      await tx.financeScenarioAssumption.createMany({
        data: source.assumptions.map((assumption) => ({
          scenarioId: scenario.id,
          financialAccountId: assumption.financialAccountId,
          kind: assumption.kind,
          percentBasisPoints: assumption.percentBasisPoints,
          amountMinorDelta: assumption.amountMinorDelta,
          absoluteAmountMinor: assumption.absoluteAmountMinor,
          note: assumption.note,
        })),
      });
    }

    const fresh = await tx.financeScenario.findUniqueOrThrow({ where: { id: scenario.id } });
    return {
      scenarioId: fresh.id,
      financeYearId: fresh.financeYearId,
      sourceForecastVersionId: fresh.sourceForecastVersionId,
      baselineLineCount: source.baselineLines.length,
      updatedAt: fresh.updatedAt,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

export async function getFinanceScenarioById(
  db: Db,
  ctx: FinanceAuthContext,
  scenarioId: string,
) {
  requireFinanceForecastView(ctx);
  return getScenarioOrThrow(db, ctx, scenarioId);
}

function mapScenarioCalculationError(error: unknown): never {
  if (error instanceof FinanceScenarioCalculationError) {
    const codeByCalculation: Record<
      FinanceScenarioCalculationErrorCode,
      FinanceDomainError["code"]
    > = {
      INVALID_SCENARIO_INPUT: "FINANCE_SCENARIO_CALCULATION_INVALID_INPUT",
      DUPLICATE_BASELINE_ACCOUNT: "FINANCE_SCENARIO_DUPLICATE_BASELINE_ACCOUNT",
      DUPLICATE_ASSUMPTION_ACCOUNT: "FINANCE_SCENARIO_DUPLICATE_ASSUMPTION_ACCOUNT",
      ASSUMPTION_ACCOUNT_NOT_IN_BASELINE: "FINANCE_SCENARIO_ASSUMPTION_NOT_IN_BASELINE",
      INVALID_ASSUMPTION_PAYLOAD: "FINANCE_SCENARIO_CALCULATION_INVALID_ASSUMPTION",
      UNSUPPORTED_ACCOUNT_TYPE: "FINANCE_SCENARIO_CALCULATION_UNSUPPORTED_ACCOUNT",
      UNSAFE_INTEGER_RESULT: "FINANCE_SCENARIO_CALCULATION_UNSAFE_INTEGER",
    };
    throw new FinanceDomainError(
      codeByCalculation[error.code],
      error.message,
      400,
    );
  }
  throw error;
}

async function getAccountSemanticsForScenarioCalculation(
  db: Db,
  ctx: FinanceAuthContext,
  financialAccountIds: string[],
) {
  const uniqueIds = [...new Set(financialAccountIds)];
  const accounts = await db.financialAccount.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, tenantId: true, canonicalSemantic: true },
  });
  if (accounts.length !== uniqueIds.length) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  for (const account of accounts) {
    assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  }
  return accounts;
}

/**
 * Loads persisted frozen baseline + assumptions and runs the canonical pure engine.
 * Does not read live Current Forecast, Approved Budget, or Automatic Forecast.
 */
export async function calculatePersistedFinanceScenario(
  db: Db,
  ctx: FinanceAuthContext,
  input: { scenarioId: string; financeYearId?: string },
): Promise<FinanceScenarioCalculationResult> {
  requireFinanceForecastView(ctx);
  const scenario = await getScenarioOrThrow(db, ctx, input.scenarioId);

  if (input.financeYearId && input.financeYearId !== scenario.financeYearId) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Scenario not found.", 404);
  }

  await getFinanceYearOrThrow(db, ctx, scenario.financeYearId);

  const baselineAccountIds = scenario.baselineLines.map((line) => line.financialAccountId);
  const accountRows = await getAccountSemanticsForScenarioCalculation(
    db,
    ctx,
    baselineAccountIds,
  );

  try {
    return calculateFinanceScenario({
      scenarioId: scenario.id,
      tenantId: scenario.tenantId,
      financeYearId: scenario.financeYearId,
      baselineLines: scenario.baselineLines.map((line) => ({
        financialAccountId: line.financialAccountId,
        amountMinor: line.amountMinor,
      })),
      assumptions: scenario.assumptions.map((assumption) => ({
        financialAccountId: assumption.financialAccountId,
        kind: assumption.kind as ScenarioAssumptionKindV1,
        percentBasisPoints: assumption.percentBasisPoints,
        amountMinorDelta: assumption.amountMinorDelta,
        absoluteAmountMinor: assumption.absoluteAmountMinor,
      })),
      accountSemantics: accountRows.map((account) => ({
        financialAccountId: account.id,
        canonicalSemantic: account.canonicalSemantic as FinanceScenarioPlanningAccountSemantic,
      })),
    });
  } catch (error) {
    mapScenarioCalculationError(error);
  }
}

/** Guard: ordinary lifecycle must not mutate frozen baseline rows (FIN-04D-02). */
export function assertFinanceScenarioBaselineMutationForbidden(): never {
  throw new FinanceDomainError(
    "FINANCE_FORECAST_IMMUTABLE",
    "Scenario baseline lines are immutable after creation.",
    409,
  );
}
