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
import { sortExpectedFinancialEventsForList } from "@/lib/finance/forecast/compare-expected-financial-events";
import {
  mapExpectedFinancialEventRow,
  type ExpectedFinancialEventRecord,
} from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";
import {
  assertManualExpectedEventAmountMinor,
  validateManualExpectedFinancialEventInput,
} from "@/lib/finance/forecast/expected-financial-event-service-validation";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeExpectedFinancialEvent"
  | "financeYear"
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

function parseExpectedUpdatedAt(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_STALE",
      "Invalid concurrency token.",
      409,
    );
  }
  return parsed;
}

function validatedTimingToPrismaDates(validated: {
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso: string | null;
  expectedMonthStartIso: string | null;
  rangeStartDateIso: string | null;
  rangeEndDateIso: string | null;
}) {
  return {
    expectedDate: validated.expectedDateIso
      ? parseFinanceCalendarDateIso(validated.expectedDateIso)
      : null,
    expectedMonthStart: validated.expectedMonthStartIso
      ? parseFinanceCalendarDateIso(validated.expectedMonthStartIso)
      : null,
    rangeStartDate: validated.rangeStartDateIso
      ? parseFinanceCalendarDateIso(validated.rangeStartDateIso)
      : null,
    rangeEndDate: validated.rangeEndDateIso
      ? parseFinanceCalendarDateIso(validated.rangeEndDateIso)
      : null,
  };
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountForExpectedEventOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  financialAccountId: string,
  forCreate: boolean,
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
      "FINANCE_EXPECTED_EVENT_INVALID_ACCOUNT",
      "Expected events must reference income or expense accounts.",
      400,
    );
  }
  if (forCreate && account.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_ARCHIVED_ACCOUNT",
      "Archived accounts cannot receive new expected events.",
      409,
    );
  }
  return account;
}

async function getExpectedEventOrThrow(db: Db, ctx: FinanceAuthContext, eventId: string) {
  const event = await db.financeExpectedFinancialEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_NOT_FOUND",
      "Expected financial event not found.",
      404,
    );
  }
  assertSameTenant(event.tenantId, ctx.tenantId, "Expected financial event");
  return event;
}

export function assertGenericManualExpectedEventMutationAllowed(event: {
  sourceKind: string;
  sourceRefType: string | null;
  sourceRefId: string | null;
}): void {
  if (event.sourceKind !== "MANUAL") {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_SOURCE_MUTATION_FORBIDDEN",
      "Source-owned expected events cannot be changed through manual management.",
      409,
    );
  }
  if (event.sourceRefType != null && event.sourceRefId != null) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_SOURCE_MUTATION_FORBIDDEN",
      "Expected events linked to an external source reference require source integration.",
      409,
    );
  }
}

export type CreateFinanceExpectedFinancialEventInput = {
  financeYearId: string;
  financialAccountId: string;
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
  description?: string | null;
};

export type UpdateFinanceExpectedFinancialEventInput = {
  expectedAmountMinor?: number;
  timingPrecision?: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
  description?: string | null;
  expectedUpdatedAt: Date | string;
};

export type ListFinanceExpectedFinancialEventsInput = {
  financeYearId: string;
  financialAccountId?: string;
};

export async function createFinanceExpectedFinancialEvent(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinanceExpectedFinancialEventInput,
): Promise<ExpectedFinancialEventRecord> {
  requireFinanceForecastManage(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);
  await getAccountForExpectedEventOrThrow(db, ctx, input.financialAccountId, true);

  const validated = validateManualExpectedFinancialEventInput({
    tenantId: ctx.tenantId,
    financeYearId: input.financeYearId,
    financialAccountId: input.financialAccountId,
    expectedAmountMinor: input.expectedAmountMinor,
    timingPrecision: input.timingPrecision,
    expectedDateIso: input.expectedDateIso,
    expectedMonthStartIso: input.expectedMonthStartIso,
    rangeStartDateIso: input.rangeStartDateIso,
    rangeEndDateIso: input.rangeEndDateIso,
    description: input.description,
  });

  const dates = validatedTimingToPrismaDates(validated);

  try {
    const row = await db.financeExpectedFinancialEvent.create({
      data: {
        tenantId: ctx.tenantId,
        financeYearId: validated.financeYearId,
        financialAccountId: validated.financialAccountId,
        expectedAmountMinor: validated.expectedAmountMinor,
        timingPrecision: validated.timingPrecision,
        ...dates,
        sourceKind: "MANUAL",
        sourceRefType: null,
        sourceRefId: null,
        description: validated.description,
        createdByUserId: ctx.userId,
        updatedByUserId: ctx.userId,
      },
    });
    return mapExpectedFinancialEventRow(row);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new FinanceDomainError(
        "FINANCE_EXPECTED_EVENT_SOURCE_IDENTITY_CONFLICT",
        "An expected event with this source identity already exists.",
        409,
      );
    }
    throw error;
  }
}

export async function getFinanceExpectedFinancialEvent(
  db: Db,
  ctx: FinanceAuthContext,
  eventId: string,
): Promise<ExpectedFinancialEventRecord> {
  requireFinanceForecastView(ctx);
  const event = await getExpectedEventOrThrow(db, ctx, eventId);
  return mapExpectedFinancialEventRow(event);
}

export async function listFinanceExpectedFinancialEvents(
  db: Db,
  ctx: FinanceAuthContext,
  input: ListFinanceExpectedFinancialEventsInput,
): Promise<ExpectedFinancialEventRecord[]> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);
  if (input.financialAccountId) {
    await getAccountForExpectedEventOrThrow(db, ctx, input.financialAccountId, false);
  }

  const rows = await db.financeExpectedFinancialEvent.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      ...(input.financialAccountId
        ? { financialAccountId: input.financialAccountId }
        : {}),
    },
  });

  return sortExpectedFinancialEventsForList(rows.map(mapExpectedFinancialEventRow));
}

export async function updateFinanceExpectedFinancialEvent(
  db: Db,
  ctx: FinanceAuthContext,
  eventId: string,
  input: UpdateFinanceExpectedFinancialEventInput,
): Promise<ExpectedFinancialEventRecord> {
  requireFinanceForecastManage(ctx);
  const existing = await getExpectedEventOrThrow(db, ctx, eventId);
  assertGenericManualExpectedEventMutationAllowed(existing);

  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);

  const mergedAmount =
    input.expectedAmountMinor !== undefined
      ? input.expectedAmountMinor
      : existing.expectedAmountMinor;
  if (input.expectedAmountMinor !== undefined) {
    assertManualExpectedEventAmountMinor(mergedAmount);
  }

  const nextPrecision = input.timingPrecision ?? existing.timingPrecision;
  const precisionChanged =
    input.timingPrecision !== undefined && input.timingPrecision !== existing.timingPrecision;

  const expectedDateIso =
    input.expectedDateIso !== undefined
      ? input.expectedDateIso
      : precisionChanged
        ? null
        : existing.expectedDate
          ? formatFinanceCalendarDateIso(existing.expectedDate)
          : null;
  const expectedMonthStartIso =
    input.expectedMonthStartIso !== undefined
      ? input.expectedMonthStartIso
      : precisionChanged
        ? null
        : existing.expectedMonthStart
          ? formatFinanceCalendarDateIso(existing.expectedMonthStart)
          : null;
  const rangeStartDateIso =
    input.rangeStartDateIso !== undefined
      ? input.rangeStartDateIso
      : precisionChanged
        ? null
        : existing.rangeStartDate
          ? formatFinanceCalendarDateIso(existing.rangeStartDate)
          : null;
  const rangeEndDateIso =
    input.rangeEndDateIso !== undefined
      ? input.rangeEndDateIso
      : precisionChanged
        ? null
        : existing.rangeEndDate
          ? formatFinanceCalendarDateIso(existing.rangeEndDate)
          : null;

  const validated = validateManualExpectedFinancialEventInput({
    tenantId: ctx.tenantId,
    financeYearId: existing.financeYearId,
    financialAccountId: existing.financialAccountId,
    expectedAmountMinor: mergedAmount,
    timingPrecision: nextPrecision,
    expectedDateIso,
    expectedMonthStartIso,
    rangeStartDateIso,
    rangeEndDateIso,
    description:
      input.description !== undefined ? input.description : existing.description,
  });

  const dates = validatedTimingToPrismaDates(validated);

  const result = await db.financeExpectedFinancialEvent.updateMany({
    where: {
      id: eventId,
      tenantId: ctx.tenantId,
      updatedAt: expectedUpdatedAt,
    },
    data: {
      expectedAmountMinor: validated.expectedAmountMinor,
      timingPrecision: validated.timingPrecision,
      ...dates,
      description: validated.description,
      updatedByUserId: ctx.userId,
    },
  });

  if (result.count === 0) {
    const current = await db.financeExpectedFinancialEvent.findUnique({ where: { id: eventId } });
    if (!current || current.tenantId !== ctx.tenantId) {
      throw new FinanceDomainError(
        "FINANCE_EXPECTED_EVENT_NOT_FOUND",
        "Expected financial event not found.",
        404,
      );
    }
    assertGenericManualExpectedEventMutationAllowed(current);
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_STALE",
      "The expected event changed. Refresh and try again.",
      409,
    );
  }

  const row = await db.financeExpectedFinancialEvent.findUniqueOrThrow({ where: { id: eventId } });
  return mapExpectedFinancialEventRow(row);
}

export async function deleteFinanceExpectedFinancialEvent(
  db: Db,
  ctx: FinanceAuthContext,
  eventId: string,
  expectedUpdatedAt: Date | string,
): Promise<void> {
  requireFinanceForecastManage(ctx);
  const existing = await getExpectedEventOrThrow(db, ctx, eventId);
  assertGenericManualExpectedEventMutationAllowed(existing);

  const token = parseExpectedUpdatedAt(expectedUpdatedAt);
  const result = await db.financeExpectedFinancialEvent.deleteMany({
    where: {
      id: eventId,
      tenantId: ctx.tenantId,
      updatedAt: token,
    },
  });

  if (result.count === 0) {
    const current = await db.financeExpectedFinancialEvent.findUnique({ where: { id: eventId } });
    if (!current || current.tenantId !== ctx.tenantId) {
      throw new FinanceDomainError(
        "FINANCE_EXPECTED_EVENT_NOT_FOUND",
        "Expected financial event not found.",
        404,
      );
    }
    assertGenericManualExpectedEventMutationAllowed(current);
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_STALE",
      "The expected event changed. Refresh and try again.",
      409,
    );
  }
}
