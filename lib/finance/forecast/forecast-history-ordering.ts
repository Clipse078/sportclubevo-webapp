import type { ForecastVersionStatus } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

export type ForecastHistoryOrderableVersion = {
  forecastVersionId: string;
  versionNumber: number;
  status: ForecastVersionStatus;
};

/**
 * Prognoseverlauf display order: CURRENT first, then historical newest → oldest.
 * Uses semantic versionNumber — not createdAt.
 */
export function sortForecastHistoryForDisplay<T extends ForecastHistoryOrderableVersion>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => {
    if (a.status === "CURRENT" && b.status !== "CURRENT") return -1;
    if (b.status === "CURRENT" && a.status !== "CURRENT") return 1;
    return b.versionNumber - a.versionNumber;
  });
}

/** Domain chronology oldest → newest (charts / analysis). */
export function sortForecastHistoryChronological<T extends ForecastHistoryOrderableVersion>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => a.versionNumber - b.versionNumber);
}
