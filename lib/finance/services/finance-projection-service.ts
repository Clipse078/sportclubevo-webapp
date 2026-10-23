import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { assertValidProjectionLineRange } from "@/lib/finance/projection/projection-range-validation";
import type {
  GenerateProjectionSnapshotInput,
  GenerateProjectionSnapshotResult,
} from "@/lib/finance/projection/projection-generation-types";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeProjection"
  | "financeProjectionVersion"
  | "financeProjectionLine"
  | "financeProjectionEvidence"
  | "financeProjectionReasonCode"
  | "financeYear"
  | "financialAccount"
  | "financeConfiguration"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeActualEntry"
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

function parseUtcDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INVALID_CUTOFF",
      "actualsThroughDate must be an ISO calendar date (YYYY-MM-DD).",
    );
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Projection currency must be a three-letter ISO 4217 code.",
    );
  }
  return normalized;
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
      "Organisation base currency must be configured before generating projections.",
      409,
    );
  }
  return currency;
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountForProjectionOrThrow(
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
      "FINANCE_PROJECTION_INVALID_ACCOUNT",
      "Projection lines must reference income or expense accounts.",
    );
  }
  return account;
}

function assertLinesAllowedForSufficiency(
  dataSufficiency: GenerateProjectionSnapshotInput["dataSufficiency"],
  lines: GenerateProjectionSnapshotInput["lines"] | undefined,
): void {
  const lineList = lines ?? [];
  if (dataSufficiency === "INSUFFICIENT" && lineList.some((l) => l.projectedAmountMinor !== null)) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INSUFFICIENT_WITH_AMOUNTS",
      "Insufficient projections must not persist fabricated monetary line amounts.",
    );
  }
}

export async function resolveCurrentProjectionVersionForYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceForecastView(ctx);
  const projection = await db.financeProjection.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: {
      currentProjectionVersion: { include: { lines: true, evidence: true, reasonCodes: true } },
    },
  });
  if (!projection?.currentProjectionVersionId) return null;
  return projection.currentProjectionVersion ?? null;
}

/**
 * Persists a validated projection snapshot (FIN-04B-02). Calculation engine is external/stubbed.
 * Does not mutate forecast, budget, or actuals.
 */
export async function generateProjectionSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  input: GenerateProjectionSnapshotInput,
): Promise<GenerateProjectionSnapshotResult> {
  requireFinanceForecastManage(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);

  const tenantCurrency = await resolveTenantBaseCurrency(db, ctx);
  const currency = normalizeCurrency(input.currency);
  if (currency !== tenantCurrency) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_CURRENCY_MISMATCH",
      "Projection currency must match organisation base currency.",
      409,
    );
  }

  const lines = input.lines ?? [];
  assertLinesAllowedForSufficiency(input.dataSufficiency, lines);

  for (const line of lines) {
    await getAccountForProjectionOrThrow(db, ctx, line.financialAccountId);
    if (line.projectedAmountMinor !== null) {
      assertSafeAmountMinor(line.projectedAmountMinor);
    }
    const lower = line.lowerBoundMinor ?? null;
    const upper = line.upperBoundMinor ?? null;
    if (lower !== null) assertSafeAmountMinor(lower);
    if (upper !== null) assertSafeAmountMinor(upper);
    assertValidProjectionLineRange({
      projectedAmountMinor: line.projectedAmountMinor,
      lowerBoundMinor: lower,
      upperBoundMinor: upper,
    });
  }

  const actualsThroughDate = parseUtcDateOnly(input.actualsThroughDate);
  const evidence = input.evidence ?? [];
  for (const row of evidence) {
    if (row.financeYearId) {
      await getFinanceYearOrThrow(db, ctx, row.financeYearId);
    }
    if (row.financialAccountId) {
      await getAccountForProjectionOrThrow(db, ctx, row.financialAccountId);
    }
  }

  const run = async (tx: Db) => {
    let projection = await tx.financeProjection.findUnique({
      where: {
        tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: input.financeYearId },
      },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if (!projection) {
      try {
        projection = await tx.financeProjection.create({
          data: {
            tenantId: ctx.tenantId,
            financeYearId: input.financeYearId,
            createdByUserId: ctx.userId,
          },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          projection = await tx.financeProjection.findUniqueOrThrow({
            where: {
              tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: input.financeYearId },
            },
            include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
          });
        } else {
          throw error;
        }
      }
    }

    const previousCurrent = projection.currentProjectionVersionId
      ? await tx.financeProjectionVersion.findUnique({
          where: { id: projection.currentProjectionVersionId },
        })
      : null;

    const nextVersionNumber = (projection.versions?.[0]?.versionNumber ?? 0) + 1;

    const version = await tx.financeProjectionVersion.create({
      data: {
        financeProjectionId: projection.id,
        status: "CURRENT",
        versionNumber: nextVersionNumber,
        currency,
        actualsThroughDate,
        generatedByUserId: ctx.userId,
        generationActorType: input.generationActorType ?? "USER",
        methodologyFamily: input.methodologyFamily,
        engineVersion: input.engineVersion,
        dataSufficiency: input.dataSufficiency,
        confidence: input.confidence,
        evidenceFingerprint: input.evidenceFingerprint ?? null,
        lines: lines.length
          ? {
              create: lines.map((line) => ({
                financialAccountId: line.financialAccountId,
                projectedAmountMinor: line.projectedAmountMinor,
                lowerBoundMinor: line.lowerBoundMinor ?? null,
                upperBoundMinor: line.upperBoundMinor ?? null,
                methodologyFamily: line.methodologyFamily,
                dataSufficiency: line.dataSufficiency,
                confidence: line.confidence,
              })),
            }
          : undefined,
        evidence: evidence.length
          ? {
              create: evidence.map((row) => ({
                kind: row.kind,
                financeYearId: row.financeYearId ?? null,
                financialAccountId: row.financialAccountId ?? null,
                observationsCount: row.observationsCount ?? null,
                fromDate: row.fromDate ? parseUtcDateOnly(row.fromDate) : null,
                throughDate: row.throughDate ? parseUtcDateOnly(row.throughDate) : null,
                sourceReference: row.sourceReference ?? null,
                fingerprint: row.fingerprint ?? null,
              })),
            }
          : undefined,
        reasonCodes: {
          create: [
            ...(input.sufficiencyReasons ?? []).map((code) => ({
              dimension: "DATA_SUFFICIENCY" as const,
              code,
            })),
            ...(input.confidenceRationaleCodes ?? []).map((code) => ({
              dimension: "CONFIDENCE" as const,
              code,
            })),
          ],
        },
      },
    });

    if (previousCurrent) {
      await tx.financeProjectionVersion.update({
        where: { id: previousCurrent.id },
        data: { status: "SUPERSEDED" },
      });
    }

    await tx.financeProjection.update({
      where: { id: projection.id },
      data: { currentProjectionVersionId: version.id },
    });

    return {
      financeProjectionId: projection.id,
      projectionVersionId: version.id,
      versionNumber: nextVersionNumber,
      supersededVersionId: previousCurrent?.id ?? null,
      lineCount: lines.length,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}

/** Guard — projection snapshots are immutable after generation (refresh creates a new version). */
export async function assertProjectionVersionIsNotMutated(
  db: Db,
  ctx: FinanceAuthContext,
  projectionVersionId: string,
): Promise<void> {
  requireFinanceForecastManage(ctx);
  const version = await db.financeProjectionVersion.findUnique({
    where: { id: projectionVersionId },
    include: { financeProjection: true },
  });
  if (!version) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Projection version not found.", 404);
  }
  assertSameTenant(version.financeProjection.tenantId, ctx.tenantId, "Projection");
  throw new FinanceDomainError(
    "FINANCE_PROJECTION_IMMUTABLE",
    "Generated projection snapshots cannot be edited. Generate a new version instead.",
    409,
  );
}
