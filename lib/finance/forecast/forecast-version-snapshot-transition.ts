import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

export type ForecastVersionSnapshotMetadata = {
  revisionSource?: ForecastRevisionSource | null;
  revisionLabel?: string | null;
  note?: string | null;
  asOfDate?: Date | null;
  actualsThroughDate?: Date | null;
  previousVersionId?: string | null;
  sourceProjectionVersionId?: string | null;
};

type TransitionDb = Pick<
  PrismaClient,
  "financeForecast" | "financeForecastVersion" | "financeForecastLine" | "$transaction"
>;

export type ForecastVersionSnapshotTransitionInput = {
  forecastId: string;
  expectedCurrentForecastVersionId: string;
  createdByUserId?: string | null;
  lineSnapshot: Array<{ financialAccountId: string; amountMinor: number }>;
  newVersionMetadata: ForecastVersionSnapshotMetadata;
  forbidScenarioKeyOnSuperseded?: boolean;
};

export type ForecastVersionSnapshotTransitionResult = {
  supersededVersionId: string;
  newCurrentVersionId: string;
  newVersionNumber: number;
};

async function resolveNextVersionNumber(
  tx: Pick<PrismaClient, "financeForecastVersion">,
  forecastId: string,
): Promise<number> {
  const latest = await tx.financeForecastVersion.findFirst({
    where: { forecastId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return (latest?.versionNumber ?? 0) + 1;
}

/**
 * Atomically supersede the canonical CURRENT version and promote a full-line snapshot as the new CURRENT.
 * Used by formal reforecast (FIN-04C-02) and FIN-04B projection adoption.
 */
export async function executeForecastVersionSnapshotTransition(
  tx: TransitionDb,
  input: ForecastVersionSnapshotTransitionInput,
): Promise<ForecastVersionSnapshotTransitionResult> {
  const forecast = await tx.financeForecast.findUnique({
    where: { id: input.forecastId },
    include: {
      currentVersion: { include: { lines: true } },
    },
  });
  if (!forecast?.currentVersionId || !forecast.currentVersion) {
    throw new FinanceDomainError(
      "FINANCE_NOT_FOUND",
      "Forecast current version not found.",
      404,
    );
  }
  if (forecast.currentVersionId !== input.expectedCurrentForecastVersionId) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_STALE_CURRENT",
      "The current forecast version changed. Refresh and try again.",
      409,
    );
  }

  if (
    input.forbidScenarioKeyOnSuperseded !== false &&
    forecast.currentVersion.scenarioKey
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_SCENARIO_NOT_ALLOWED",
      "Formal rolling forecast revisions cannot use scenario versions.",
      409,
    );
  }

  const supersededVersionId = forecast.currentVersionId;
  const nextVersionNumber = await resolveNextVersionNumber(tx, forecast.id);

  await tx.financeForecastVersion.update({
    where: { id: supersededVersionId },
    data: { status: "SUPERSEDED" },
  });

  const metadata = input.newVersionMetadata;
  const newVersion = await tx.financeForecastVersion.create({
    data: {
      forecastId: forecast.id,
      status: "CURRENT",
      versionNumber: nextVersionNumber,
      scenarioKey: null,
      createdByUserId: input.createdByUserId ?? null,
      revisionSource: metadata.revisionSource ?? null,
      revisionLabel: metadata.revisionLabel?.trim() || null,
      note: metadata.note?.trim() || null,
      asOfDate: metadata.asOfDate ?? null,
      actualsThroughDate: metadata.actualsThroughDate ?? null,
      previousVersionId: metadata.previousVersionId ?? supersededVersionId,
      sourceProjectionVersionId: metadata.sourceProjectionVersionId ?? null,
      lines: {
        create: input.lineSnapshot.map((line) => ({
          financialAccountId: line.financialAccountId,
          amountMinor: line.amountMinor,
        })),
      },
    },
  });

  await tx.financeForecast.update({
    where: { id: forecast.id },
    data: { currentVersionId: newVersion.id },
  });

  return {
    supersededVersionId,
    newCurrentVersionId: newVersion.id,
    newVersionNumber: nextVersionNumber,
  };
}

export type ForecastVersionSnapshotTransitionClient = TransitionDb;

export function runForecastVersionSnapshotTransition(
  db: ForecastVersionSnapshotTransitionClient,
  input: ForecastVersionSnapshotTransitionInput,
): Promise<ForecastVersionSnapshotTransitionResult> {
  const run = (tx: TransitionDb) => executeForecastVersionSnapshotTransition(tx, input);
  if (db.$transaction) {
    return db.$transaction((tx) => run(tx as TransitionDb));
  }
  return run(db);
}

/** Copy forecast lines faithfully for snapshot promotion (includes zero amounts; no budget/actual fill). */
export function mapForecastLinesForSnapshot(
  lines: Array<{ financialAccountId: string; amountMinor: number }>,
): Array<{ financialAccountId: string; amountMinor: number }> {
  return lines.map((line) => ({
    financialAccountId: line.financialAccountId,
    amountMinor: line.amountMinor,
  }));
}
