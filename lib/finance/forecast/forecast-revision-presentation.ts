import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";

/** Product-safe revision source labels — never expose raw enum values in UI. */
export const FORECAST_REVISION_SOURCE_PRESENTATION: Record<
  ForecastRevisionSource,
  { label: string }
> = {
  INITIAL_FORECAST: { label: "Initiale Prognose" },
  MANUAL_REFORECAST: { label: "Festgehaltene Prognose" },
  AUTOMATIC_FORECAST_ADOPTION: { label: "Automatische Prognose übernommen" },
};

export const FORECAST_REVISION_LEGACY_SOURCE_LABEL = "Prognose" as const;
export const FORECAST_REVISION_LEGACY_HISTORY_TITLE = "Frühere Prognose" as const;

export function resolveForecastRevisionSourcePresentationLabel(
  revisionSource: ForecastRevisionSource | null | undefined,
): string {
  if (!revisionSource) {
    return FORECAST_REVISION_LEGACY_SOURCE_LABEL;
  }
  return FORECAST_REVISION_SOURCE_PRESENTATION[revisionSource].label;
}

export type ForecastHistoryDisplayMetadata = {
  /** Primary row title for Prognoseverlauf (04C-05). */
  displayTitle: string;
  /** Secondary metadata (Datenstand, version number). */
  displaySubtitle: string | null;
  revisionSourceLabel: string;
};

/**
 * Display-title precedence (locked for 04C-05):
 * 1. explicit revisionLabel
 * 2. revision-source-derived product label
 * 3. neutral legacy fallback
 * 4. version number as secondary metadata (never primary alone)
 */
export function buildForecastHistoryDisplayMetadata(input: {
  revisionLabel: string | null;
  revisionSource: ForecastRevisionSource | string | null;
  asOfDate: Date | null;
  versionNumber: number;
  isCurrent: boolean;
}): ForecastHistoryDisplayMetadata {
  const revisionSourceLabel = resolveForecastRevisionSourcePresentationLabel(
    (input.revisionSource as ForecastRevisionSource | null) ?? null,
  );

  let displayTitle: string;
  if (input.revisionLabel?.trim()) {
    displayTitle = input.revisionLabel.trim();
  } else if (input.revisionSource) {
    displayTitle = revisionSourceLabel;
  } else if (input.isCurrent) {
    displayTitle = revisionSourceLabel;
  } else {
    displayTitle = FORECAST_REVISION_LEGACY_HISTORY_TITLE;
  }

  const subtitleParts: string[] = [];
  if (input.asOfDate) {
    subtitleParts.push(`Datenstand ${formatFinanceCalendarDateIso(input.asOfDate)}`);
  }
  subtitleParts.push(`Version ${input.versionNumber}`);

  return {
    displayTitle,
    displaySubtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : null,
    revisionSourceLabel,
  };
}

/** Join metadata fragments without repeating identical tokens (FIN-04C-05R3). */
export function joinForecastMetadataTokens(
  tokens: readonly (string | null | undefined)[],
): string | null {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    const trimmed = token?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  return unique.length > 0 ? unique.join(" · ") : null;
}

/**
 * Secondary line for Revisionsübersicht rows — single source of truth, no duplicated Version tokens.
 */
export function buildForecastHistoryRowSecondaryLine(input: {
  displayTitle: string;
  displaySubtitle: string | null;
  revisionSourceLabel: string;
  revisionLabel: string | null;
  revisionSource: ForecastRevisionSource | string | null;
}): string | null {
  const tokens: (string | null)[] = [input.displaySubtitle];

  if (
    input.revisionSource &&
    !input.revisionLabel?.trim() &&
    input.revisionSourceLabel.trim() &&
    input.revisionSourceLabel.trim().toLowerCase() !== input.displayTitle.trim().toLowerCase()
  ) {
    tokens.push(input.revisionSourceLabel);
  }

  return joinForecastMetadataTokens(tokens);
}
