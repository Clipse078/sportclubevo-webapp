import type { ProjectionWorkspaceDashboardViewModel } from "@/lib/finance/projection/projection-workspace-dashboard";
import type { ProjectionAggregateCoverage } from "@/lib/finance/projection/projection-workspace-coverage";

const MEANINGFUL_ACCOUNT_DIVERGENCE_MINOR = 1;

export type ProjectionManagementConclusion =
  | {
      kind: "ALIGNED";
      projectedAccountCount: number;
      eligibleAccountCount: number;
      missingProjectionCount: number;
    }
  | {
      kind: "REVIEW_RECOMMENDED";
      resultDeltaMinor: number;
      forecastResultMinor: number;
      projectionResultMinor: number;
      topDrivers: Array<{
        accountId: string;
        accountName: string;
        deltaMinor: number;
      }>;
    };

export function deriveProjectionManagementConclusion(input: {
  coverage: ProjectionAggregateCoverage;
  dashboard: ProjectionWorkspaceDashboardViewModel | null;
  forecastResultMinor: number | null;
}): ProjectionManagementConclusion | null {
  const { coverage, dashboard } = input;
  if (coverage.projectedAccountCount === 0) {
    return null;
  }

  const missingProjectionCount = coverage.missingProjectionCount;
  const base = {
    projectedAccountCount: coverage.projectedAccountCount,
    eligibleAccountCount: coverage.eligibleAccountCount,
    missingProjectionCount,
  };

  const outlookResult = dashboard?.outlook.find((row) => row.metric === "RESULT");
  const forecastResultMinor =
    outlookResult?.forecastMinor ?? input.forecastResultMinor ?? null;
  const projectionResultMinor = outlookResult?.projectionMinor ?? coverage.result.minor;

  if (
    projectionResultMinor === null ||
    forecastResultMinor === null ||
    !coverage.result.complete
  ) {
    return { kind: "ALIGNED", ...base };
  }

  const resultDeltaMinor = projectionResultMinor - forecastResultMinor;
  const divergence = dashboard?.divergence ?? [];
  const meaningfulDivergence = divergence.filter(
    (row) => Math.abs(row.deltaMinor) >= MEANINGFUL_ACCOUNT_DIVERGENCE_MINOR,
  );

  if (
    Math.abs(resultDeltaMinor) < MEANINGFUL_ACCOUNT_DIVERGENCE_MINOR &&
    meaningfulDivergence.length === 0
  ) {
    return { kind: "ALIGNED", ...base };
  }

  const topDrivers = [...meaningfulDivergence]
    .sort((a, b) => b.absDeltaMinor - a.absDeltaMinor)
    .slice(0, 3)
    .map((row) => ({
      accountId: row.accountId,
      accountName: row.accountName,
      deltaMinor: row.deltaMinor,
    }));

  return {
    kind: "REVIEW_RECOMMENDED",
    resultDeltaMinor,
    forecastResultMinor,
    projectionResultMinor,
    topDrivers,
  };
}
