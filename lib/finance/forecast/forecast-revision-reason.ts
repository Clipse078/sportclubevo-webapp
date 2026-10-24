/**
 * FIN-04C-06 — optional structured reforecast reason (governance-ready, tenant-facing labels).
 */

export const FORECAST_REVISION_REASONS = [
  "PERIODIC_REVIEW",
  "NEW_ACTUALS",
  "ASSUMPTION_CHANGE",
  "OPERATIONAL_CHANGE",
  "MANAGEMENT_DECISION",
  "CORRECTION",
  "OTHER",
] as const;

export type ForecastRevisionReason = (typeof FORECAST_REVISION_REASONS)[number];

export const FORMAL_REFORECAST_REVISION_CONTEXT_MAX_LENGTH = 280;

/** German product labels — never expose raw enum values in UI. */
export const FORECAST_REVISION_REASON_PRESENTATION: Record<
  ForecastRevisionReason,
  { label: string }
> = {
  PERIODIC_REVIEW: { label: "Regelmässige Überprüfung" },
  NEW_ACTUALS: { label: "Neue Ist-Daten" },
  ASSUMPTION_CHANGE: { label: "Geänderte Annahmen" },
  OPERATIONAL_CHANGE: { label: "Operative Änderung" },
  MANAGEMENT_DECISION: { label: "Management-Entscheid" },
  CORRECTION: { label: "Korrektur" },
  OTHER: { label: "Anderer Grund" },
};

export function isKnownForecastRevisionReason(
  value: string,
): value is ForecastRevisionReason {
  return (FORECAST_REVISION_REASONS as readonly string[]).includes(value);
}

export function resolveForecastRevisionReasonPresentationLabel(
  reason: ForecastRevisionReason | null | undefined,
): string | null {
  if (!reason) return null;
  return FORECAST_REVISION_REASON_PRESENTATION[reason].label;
}

export function normalizeFormalReforecastRevisionReason(
  value: string | null | undefined,
): ForecastRevisionReason | null {
  if (value == null || value.trim() === "") return null;
  const trimmed = value.trim();
  if (!isKnownForecastRevisionReason(trimmed)) {
    return null;
  }
  return trimmed;
}

export function normalizeFormalReforecastRevisionContext(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
