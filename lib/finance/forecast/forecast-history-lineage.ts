import type { ForecastVersionStatus } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

export type ForecastHistoryLineageVersion = {
  forecastVersionId: string;
  forecastId: string;
  versionNumber: number;
  status: ForecastVersionStatus;
  previousVersionId: string | null;
  scenarioKey: string | null;
};

export type ForecastHistoryLineageDiagnosticKind =
  | "SELF_REFERENCE"
  | "MISSING_PREVIOUS_VERSION"
  | "PREVIOUS_WRONG_FORECAST"
  | "LINEAGE_CYCLE"
  | "NON_MONOTONIC_VERSION_NUMBER";

export type ForecastHistoryLineageDiagnostic = {
  kind: ForecastHistoryLineageDiagnosticKind;
  forecastVersionId: string;
  detail: string;
};

export function isCanonicalManagementForecastVersion(version: {
  scenarioKey: string | null;
}): boolean {
  return version.scenarioKey == null || version.scenarioKey.trim() === "";
}

/**
 * Resolves the forecast revision immediately preceding `currentVersion`.
 *
 * Preferred: `currentVersion.previousVersionId`.
 * Legacy fallback (same FinanceForecast only): highest `versionNumber` among
 * canonical management versions with versionNumber < current.versionNumber.
 *
 * Never uses MAX(versionNumber) to identify CURRENT — caller supplies current via pointer.
 */
export function resolvePreviousForecastVersionId(
  currentVersion: Pick<
    ForecastHistoryLineageVersion,
    "forecastVersionId" | "forecastId" | "versionNumber" | "previousVersionId"
  >,
  allVersions: readonly ForecastHistoryLineageVersion[],
): string | null {
  const scoped = allVersions.filter(
    (row) =>
      row.forecastId === currentVersion.forecastId &&
      isCanonicalManagementForecastVersion(row),
  );

  if (currentVersion.previousVersionId) {
    const pointed = scoped.find((row) => row.forecastVersionId === currentVersion.previousVersionId);
    if (pointed && pointed.forecastVersionId !== currentVersion.forecastVersionId) {
      return pointed.forecastVersionId;
    }
  }

  const legacyCandidates = scoped.filter(
    (row) =>
      row.forecastVersionId !== currentVersion.forecastVersionId &&
      row.versionNumber < currentVersion.versionNumber,
  );
  if (legacyCandidates.length === 0) {
    return null;
  }
  legacyCandidates.sort((a, b) => b.versionNumber - a.versionNumber);
  return legacyCandidates[0]!.forecastVersionId;
}

export function detectForecastHistoryLineageDiagnostics(
  versions: readonly ForecastHistoryLineageVersion[],
): ForecastHistoryLineageDiagnostic[] {
  const diagnostics: ForecastHistoryLineageDiagnostic[] = [];
  const byId = new Map(versions.map((row) => [row.forecastVersionId, row]));

  for (const version of versions) {
    if (!isCanonicalManagementForecastVersion(version)) {
      continue;
    }
    if (version.previousVersionId === version.forecastVersionId) {
      diagnostics.push({
        kind: "SELF_REFERENCE",
        forecastVersionId: version.forecastVersionId,
        detail: "Version references itself as previousVersionId.",
      });
      continue;
    }
    if (!version.previousVersionId) {
      continue;
    }
    const previous = byId.get(version.previousVersionId);
    if (!previous) {
      diagnostics.push({
        kind: "MISSING_PREVIOUS_VERSION",
        forecastVersionId: version.forecastVersionId,
        detail: "previousVersionId points to a missing version.",
      });
      continue;
    }
    if (previous.forecastId !== version.forecastId) {
      diagnostics.push({
        kind: "PREVIOUS_WRONG_FORECAST",
        forecastVersionId: version.forecastVersionId,
        detail: "previousVersionId belongs to a different forecast container.",
      });
    }
    if (previous.versionNumber >= version.versionNumber) {
      diagnostics.push({
        kind: "NON_MONOTONIC_VERSION_NUMBER",
        forecastVersionId: version.forecastVersionId,
        detail: "Previous version number is not lower than successor.",
      });
    }
  }

  for (const start of versions) {
    if (!isCanonicalManagementForecastVersion(start)) continue;
    const visited = new Set<string>();
    let cursor: ForecastHistoryLineageVersion | undefined = start;
    while (cursor?.previousVersionId) {
      if (visited.has(cursor.forecastVersionId)) {
        diagnostics.push({
          kind: "LINEAGE_CYCLE",
          forecastVersionId: start.forecastVersionId,
          detail: "Lineage chain contains a cycle.",
        });
        break;
      }
      visited.add(cursor.forecastVersionId);
      const next = byId.get(cursor.previousVersionId);
      if (!next) break;
      cursor = next;
    }
  }

  return diagnostics;
}
