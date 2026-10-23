import type { FinanceActualEntrySource, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assertEffectiveDateWithinFinanceYear } from "@/lib/finance/actual/finance-year-membership";
import {
  requireFinanceActualManage,
  requireFinanceActualView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import "@/lib/finance/actual/actual-account-delete-guard";

type Db = Pick<
  PrismaClient,
  | "financeActualEntry"
  | "financeYear"
  | "financialAccount"
  | "financeConfiguration"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

function parseEffectiveDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new FinanceDomainError("FINANCE_ACTUAL_INVALID_DATE", "Invalid actual date.", 400);
  }
  return date;
}

function assertPositiveActualAmount(amountMinor: number): void {
  assertSafeAmountMinor(amountMinor);
  if (amountMinor < 0) {
    throw new FinanceDomainError(
      "FINANCE_ACTUAL_INVALID_AMOUNT",
      "Actual amounts must be zero or a positive magnitude.",
      400,
    );
  }
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountForActualOrThrow(
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
      "FINANCE_ACTUAL_INVALID_ACCOUNT",
      "Actuals must reference income or expense accounts.",
    );
  }
  if (forCreate && account.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_ARCHIVED",
      "Archived accounts cannot receive new actual entries.",
      409,
    );
  }
  return account;
}

async function resolveTenantBaseCurrency(db: Db, ctx: FinanceAuthContext): Promise<string> {
  const config = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  const currency = config?.baseCurrency?.trim().toUpperCase() ?? null;
  if (!currency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Organisation finance base currency is not configured.",
      409,
    );
  }
  return currency;
}

function assertCurrencyMatchesBase(inputCurrency: string, baseCurrency: string): void {
  const normalized = inputCurrency.trim().toUpperCase();
  if (normalized !== baseCurrency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Actual currency must match the organisation finance base currency.",
      400,
    );
  }
}

export type CreateFinanceActualInput = {
  financeYearId: string;
  financialAccountId: string;
  effectiveDate: Date | string;
  amountMinor: number;
  currency: string;
  description?: string | null;
  source?: FinanceActualEntrySource;
};

export type UpdateFinanceActualInput = {
  effectiveDate?: Date | string;
  amountMinor?: number;
  description?: string | null;
};

export async function createFinanceActualEntry(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinanceActualInput,
) {
  requireFinanceActualManage(ctx);
  const year = await getFinanceYearOrThrow(db, ctx, input.financeYearId);
  await getAccountForActualOrThrow(db, ctx, input.financialAccountId, true);
  const baseCurrency = await resolveTenantBaseCurrency(db, ctx);
  assertCurrencyMatchesBase(input.currency, baseCurrency);
  assertPositiveActualAmount(input.amountMinor);

  const effectiveDate = parseEffectiveDate(input.effectiveDate);
  assertEffectiveDateWithinFinanceYear(effectiveDate, year);

  return db.financeActualEntry.create({
    data: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      financialAccountId: input.financialAccountId,
      effectiveDate,
      amountMinor: input.amountMinor,
      currency: baseCurrency,
      description: input.description?.trim() || null,
      source: input.source ?? "MANUAL",
      createdByUserId: ctx.userId,
      updatedByUserId: ctx.userId,
    },
  });
}

export async function updateFinanceActualEntry(
  db: Db,
  ctx: FinanceAuthContext,
  entryId: string,
  input: UpdateFinanceActualInput,
) {
  requireFinanceActualManage(ctx);
  const existing = await db.financeActualEntry.findUnique({ where: { id: entryId } });
  if (!existing) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Actual entry not found.", 404);
  }
  assertSameTenant(existing.tenantId, ctx.tenantId, "Actual entry");

  const year = await getFinanceYearOrThrow(db, ctx, existing.financeYearId);

  const effectiveDate =
    input.effectiveDate !== undefined
      ? parseEffectiveDate(input.effectiveDate)
      : existing.effectiveDate;
  assertEffectiveDateWithinFinanceYear(effectiveDate, year);

  if (input.amountMinor !== undefined) {
    assertPositiveActualAmount(input.amountMinor);
  }

  return db.financeActualEntry.update({
    where: { id: entryId },
    data: {
      effectiveDate,
      amountMinor: input.amountMinor ?? existing.amountMinor,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
      updatedByUserId: ctx.userId,
    },
  });
}

export async function deleteFinanceActualEntry(
  db: Db,
  ctx: FinanceAuthContext,
  entryId: string,
) {
  requireFinanceActualManage(ctx);
  const existing = await db.financeActualEntry.findUnique({ where: { id: entryId } });
  if (!existing) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Actual entry not found.", 404);
  }
  assertSameTenant(existing.tenantId, ctx.tenantId, "Actual entry");
  await db.financeActualEntry.delete({ where: { id: entryId } });
}

export async function listFinanceActualEntriesForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceActualView(ctx);
  await getFinanceYearOrThrow(db, ctx, financeYearId);
  return db.financeActualEntry.findMany({
    where: { tenantId: ctx.tenantId, financeYearId },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    include: {
      financialAccount: {
        select: {
          id: true,
          name: true,
          canonicalSemantic: true,
          lifecycle: true,
        },
      },
    },
  });
}
