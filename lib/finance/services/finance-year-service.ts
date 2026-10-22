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
import { ensureFinanceConfigurationRow } from "@/lib/finance/services/finance-configuration-service";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { logAction } from "@/lib/audit/log-action";

type Db = Pick<
  PrismaClient,
  "financeYear" | "financeConfiguration" | "season"
>;

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
      name: input.name.trim(),
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

export async function getFinanceYear(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceView(ctx);
  const year = await db.financeYear.findUnique({ where: { id } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}
