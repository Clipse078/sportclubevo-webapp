import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { validateFormalRevisionMetadata } from "@/lib/finance/forecast/forecast-revision-metadata-validation";
import {
  validatePreviousForecastVersionLineage,
  validateSourceProjectionVersionProvenance,
} from "@/lib/finance/forecast/forecast-revision-lineage-validation";
import type {
  FormalForecastRevisionResult,
  PersistFormalForecastRevisionInput,
} from "@/lib/finance/forecast/forecast-revision-persistence-types";
import {
  executeForecastVersionSnapshotTransition,
  mapForecastLinesForSnapshot,
} from "@/lib/finance/forecast/forecast-version-snapshot-transition";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeYear"
  | "financeProjectionVersion"
  | "financeProjection"
  | "$transaction"
>;

/**
 * Lowest-level transactional primitive for formal forecast revision (FIN-04C-02).
 * FIN-04C-03 will expose tenant-facing "Neue Prognose festhalten" on top of this.
 *
 * Permission enforcement (`finance.forecast.manage`) belongs at the 04C-03 boundary.
 */
export async function persistFormalForecastRevision(
  db: Db,
  input: PersistFormalForecastRevisionInput,
): Promise<FormalForecastRevisionResult> {
  const financeYear = await db.financeYear.findUnique({ where: { id: input.financeYearId } });
  if (!financeYear) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(financeYear.tenantId, input.tenantId, "Financial year");

  const { asOfDate, actualsThroughDate } = validateFormalRevisionMetadata(input, financeYear);

  const forecast = await db.financeForecast.findUnique({
    where: {
      tenantId_financeYearId: {
        tenantId: input.tenantId,
        financeYearId: input.financeYearId,
      },
    },
    select: { id: true, currentVersionId: true, tenantId: true },
  });
  if (!forecast?.currentVersionId) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Forecast not found for financial year.", 404);
  }

  const currentVersion = await db.financeForecastVersion.findUnique({
    where: { id: forecast.currentVersionId },
    include: {
      lines: true,
      forecast: { select: { id: true, tenantId: true, financeYearId: true } },
    },
  });
  if (!currentVersion || currentVersion.forecastId !== forecast.id) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Current forecast version not found.", 404);
  }
  assertSameTenant(currentVersion.forecast.tenantId, input.tenantId, "Forecast");
  if (currentVersion.id !== input.expectedCurrentForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_STALE_CURRENT",
      "The current forecast version changed. Refresh and try again.",
      409,
    );
  }

  const previousVersionId = input.previousVersionId ?? currentVersion.id;
  await validatePreviousForecastVersionLineage(db, {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    forecastId: forecast.id,
    expectedPreviousVersionId: previousVersionId,
  });

  if (input.sourceProjectionVersionId) {
    await validateSourceProjectionVersionProvenance(db, {
      tenantId: input.tenantId,
      financeYearId: input.financeYearId,
      sourceProjectionVersionId: input.sourceProjectionVersionId,
    });
  }

  const lineSnapshot = mapForecastLinesForSnapshot(
    currentVersion.lines.map((line) => ({
      financialAccountId: line.financialAccountId,
      amountMinor: line.amountMinor,
    })),
  );

  const run = async (tx: Db) => {
    const transition = await executeForecastVersionSnapshotTransition(tx, {
      forecastId: forecast.id,
      expectedCurrentForecastVersionId: input.expectedCurrentForecastVersionId,
      createdByUserId: input.createdByUserId ?? null,
      lineSnapshot,
      newVersionMetadata: {
        revisionSource: input.revisionSource,
        revisionLabel: input.revisionLabel ?? null,
        revisionReason: input.revisionReason ?? null,
        revisionContext: input.revisionContext ?? null,
        note: input.note ?? null,
        asOfDate,
        actualsThroughDate,
        previousVersionId,
        sourceProjectionVersionId: input.sourceProjectionVersionId ?? null,
      },
    });

    return {
      forecastId: forecast.id,
      supersededVersionId: transition.supersededVersionId,
      newCurrentVersionId: transition.newCurrentVersionId,
      newVersionNumber: transition.newVersionNumber,
    };
  };

  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as Db));
  }
  return run(db);
}
