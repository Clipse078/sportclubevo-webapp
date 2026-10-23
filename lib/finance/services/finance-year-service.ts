import type { FinanceYearStatus, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceAdmin,
  requireFinanceView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  assertValidFinanceYearRange,
  deriveSetupStatusAfterMutation,
  financeYearOverlaps,
} from "@/lib/finance/setup/finance-setup-state";
import { assertValidFinanceYearDisplayName } from "@/lib/finance/setup/finance-year-display-name";
import { ensureFinanceConfigurationRow } from "@/lib/finance/services/finance-configuration-service";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { logAction } from "@/lib/audit/log-action";

type Db = Pick<
  PrismaClient,
  "financeYear" | "financeConfiguration" | "season" | "financeBudget" | "financeBudgetVersion"
>;

export type UpdateFinanceYearInput = {
  name?: string;
  startDate?: Date;
  endDate?: Date;
};

function sameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

async function financeYearHasApprovedBudgetHistory(
  db: Pick<PrismaClient, "financeBudget" | "financeBudgetVersion">,
  tenantId: string,
  financeYearId: string,
): Promise<boolean> {
  const budget = await db.financeBudget.findUnique({
    where: { tenantId_financeYearId: { tenantId, financeYearId } },
    select: { id: true },
  });
  if (!budget) {
    return false;
  }
  const approvedCount = await db.financeBudgetVersion.count({
    where: { budgetId: budget.id, status: "APPROVED" },
  });
  return approvedCount > 0;
}

export type CreateFinanceYearInput = {
  name: string;
  startDate: Date;
  endDate: Date;
  status?: FinanceYearStatus;
  seasonId?: string | null;
};

function mapYearError(error: unknown): never {
  if (error instanceof Error && error.message === "FINANCE_INVALID_YEAR") {
    throw new FinanceDomainError(
      "FINANCE_INVALID_YEAR",
      "Financial year end date must be after the start date.",
    );
  }
  throw error;
}

export async function createFinanceYear(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinanceYearInput,
) {
  requireFinanceAdmin(ctx);
  const name = assertValidFinanceYearDisplayName(input.name);
  try {
    assertValidFinanceYearRange(input.startDate, input.endDate);
  } catch (e) {
    mapYearError(e);
  }

  if (input.seasonId) {
    const season = await db.season.findUnique({ where: { id: input.seasonId } });
    if (!season) {
      throw new FinanceDomainError("FINANCE_NOT_FOUND", "Season not found.", 404);
    }
  }

  const siblings = await db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    select: { startDate: true, endDate: true },
  });
  for (const existing of siblings) {
    if (
      financeYearOverlaps(existing, {
        startDate: input.startDate,
        endDate: input.endDate,
      })
    ) {
      throw new FinanceDomainError(
        "FINANCE_INVALID_YEAR",
        "Financial year dates overlap an existing year for this organisation.",
      );
    }
  }

  const year = await db.financeYear.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "DRAFT",
      seasonId: input.seasonId ?? null,
    },
  });

  const config = await ensureFinanceConfigurationRow(db, ctx.tenantId);
  const yearCount = await db.financeYear.count({ where: { tenantId: ctx.tenantId } });
  await db.financeConfiguration.update({
    where: { tenantId: ctx.tenantId },
    data: {
      setupStatus: deriveSetupStatusAfterMutation({
        baseCurrency: config.baseCurrency,
        financeYearCount: yearCount,
        previous: config.setupStatus,
      }),
      currentFinanceYearId: config.currentFinanceYearId ?? year.id,
    },
  });

  await logAction({
    moduleKey: "finance",
    action: "year.created",
    entityType: "FinanceYear",
    entityId: year.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    metadataJson: { name: year.name },
  }).catch(() => undefined);

  return year;
}

export async function listFinanceYears(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  return db.financeYear.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ startDate: "desc" }],
  });
}

export type FinanceYearSettingsRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  periodEditable: boolean;
};

export async function listFinanceYearsForSettings(
  db: Db,
  ctx: FinanceAuthContext,
): Promise<FinanceYearSettingsRow[]> {
  requireFinanceAdmin(ctx);
  const years = await listFinanceYears(db, ctx);
  return Promise.all(
    years.map(async (year) => ({
      id: year.id,
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      periodEditable: !(await financeYearHasApprovedBudgetHistory(
        db,
        ctx.tenantId,
        year.id,
      )),
    })),
  );
}

export async function getFinanceYear(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceView(ctx);
  const year = await db.financeYear.findUnique({ where: { id } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

export async function updateFinanceYear(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  input: UpdateFinanceYearInput,
) {
  requireFinanceAdmin(ctx);
  const existing = await getFinanceYear(db, ctx, id);

  const nextName =
    input.name !== undefined ? assertValidFinanceYearDisplayName(input.name) : existing.name;
  const nextStart = input.startDate ?? existing.startDate;
  const nextEnd = input.endDate ?? existing.endDate;

  const periodChanging =
    !sameInstant(nextStart, existing.startDate) || !sameInstant(nextEnd, existing.endDate);

  if (periodChanging) {
    const locked = await financeYearHasApprovedBudgetHistory(db, ctx.tenantId, id);
    if (locked) {
      throw new FinanceDomainError(
        "FINANCE_BUDGET_IMMUTABLE",
        "Financial year dates cannot change after an approved budget baseline exists. Rename the year or create a new financial year instead.",
      );
    }
    try {
      assertValidFinanceYearRange(nextStart, nextEnd);
    } catch (e) {
      mapYearError(e);
    }

    const siblings = await db.financeYear.findMany({
      where: { tenantId: ctx.tenantId, id: { not: id } },
      select: { startDate: true, endDate: true },
    });
    for (const sibling of siblings) {
      if (financeYearOverlaps(sibling, { startDate: nextStart, endDate: nextEnd })) {
        throw new FinanceDomainError(
          "FINANCE_INVALID_YEAR",
          "Financial year dates overlap an existing year for this organisation.",
        );
      }
    }
  }

  const updated = await db.financeYear.update({
    where: { id },
    data: {
      name: nextName,
      ...(periodChanging ? { startDate: nextStart, endDate: nextEnd } : {}),
    },
  });

  await logAction({
    moduleKey: "finance",
    action: "year.updated",
    entityType: "FinanceYear",
    entityId: updated.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    metadataJson: {
      name: updated.name,
      periodChanged: periodChanging,
    },
  }).catch(() => undefined);

  return updated;
}
