import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type LineageDb = Pick<
  PrismaClient,
  "financeForecastVersion" | "financeProjectionVersion" | "financeProjection"
>;

export async function validatePreviousForecastVersionLineage(
  db: LineageDb,
  input: {
    tenantId: string;
    financeYearId: string;
    forecastId: string;
    expectedPreviousVersionId: string;
    newVersionIdPlaceholder?: string;
  },
): Promise<void> {
  const previous = await db.financeForecastVersion.findUnique({
    where: { id: input.expectedPreviousVersionId },
    include: { forecast: { select: { id: true, tenantId: true, financeYearId: true } } },
  });
  if (!previous) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LINEAGE",
      "Previous forecast version not found.",
      404,
    );
  }
  assertSameTenant(previous.forecast.tenantId, input.tenantId, "Forecast");
  if (previous.forecast.id !== input.forecastId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LINEAGE",
      "Previous version must belong to the same forecast container.",
    );
  }
  if (previous.forecast.financeYearId !== input.financeYearId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LINEAGE",
      "Forecast revision lineage cannot cross financial years.",
    );
  }
  if (input.newVersionIdPlaceholder && previous.id === input.newVersionIdPlaceholder) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LINEAGE",
      "Forecast version cannot reference itself as previous version.",
    );
  }
}

export async function validateSourceProjectionVersionProvenance(
  db: LineageDb,
  input: {
    tenantId: string;
    financeYearId: string;
    sourceProjectionVersionId: string;
  },
): Promise<void> {
  const projectionVersion = await db.financeProjectionVersion.findUnique({
    where: { id: input.sourceProjectionVersionId },
    include: {
      financeProjection: { select: { tenantId: true, financeYearId: true } },
    },
  });
  if (!projectionVersion) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_PROJECTION_SOURCE",
      "Source projection version not found.",
      404,
    );
  }
  assertSameTenant(projectionVersion.financeProjection.tenantId, input.tenantId, "Projection");
  if (projectionVersion.financeProjection.financeYearId !== input.financeYearId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_PROJECTION_SOURCE",
      "Projection provenance cannot cross financial years.",
    );
  }
}
