import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";

export const FINANCE_REPORTING_INVESTIGATION_EVIDENCE_INITIAL_VISIBLE = 12;

export type FinanceActualEntryDescriptionPresentation =
  | { kind: "MEANINGFUL"; text: string }
  | { kind: "ABSENT" };

function trimDescription(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Detects descriptions that are technical/fixture metadata rather than user-facing copy.
 * Does not mutate source data — presentation-only filter.
 */
export function isOpaqueFinanceActualEntryDescription(value: string): boolean {
  if (value.includes("|")) {
    const segments = value.split("|").map((s) => s.trim());
    if (segments.length >= 2) {
      const identifierLike = segments.filter(
        (s) => s.length >= 3 && /^[A-Z0-9_.:-]+$/.test(s) && /[_0-9]/.test(s),
      );
      if (identifierLike.length >= 2) return true;
    }
  }

  if (!/\s/.test(value) && value.length >= 16 && /^[A-Z0-9][A-Z0-9_.|:\-]+$/.test(value)) {
    return true;
  }

  if (/\b(UAT|FIXTURE|TEST_DATA|SCE_FIN|_UAT_)\b/i.test(value)) {
    return true;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }

  return false;
}

export function resolveFinanceActualEntryDescriptionPresentation(
  description: string | null | undefined,
): FinanceActualEntryDescriptionPresentation {
  const trimmed = trimDescription(description);
  if (!trimmed) return { kind: "ABSENT" };
  if (isOpaqueFinanceActualEntryDescription(trimmed)) return { kind: "ABSENT" };
  return { kind: "MEANINGFUL", text: trimmed };
}

export type FinanceReportingInvestigationInterpretation =
  | {
      kind: "FORECAST_VS_BUDGET";
      direction: "ABOVE" | "BELOW" | "ON_PLAN";
      varianceAmountMinor: number;
      varianceFormatted: string;
    }
  | { kind: "UNAVAILABLE" };

export function buildFinanceReportingInvestigationInterpretation(input: {
  forecastVsBudget: FinanceReportingComparisonSlice;
  baseCurrency: string | null;
  locale: string;
}): FinanceReportingInvestigationInterpretation {
  const slice = input.forecastVsBudget;
  if (slice.availability !== "AVAILABLE" || slice.rawDeltaMinor === null) {
    return { kind: "UNAVAILABLE" };
  }
  if (slice.rawDeltaMinor === 0) {
    return {
      kind: "FORECAST_VS_BUDGET",
      direction: "ON_PLAN",
      varianceAmountMinor: 0,
      varianceFormatted: formatFinanceManagementMoneyMinor(0, input.baseCurrency, input.locale),
    };
  }

  const direction = slice.rawDeltaMinor > 0 ? "ABOVE" : "BELOW";
  return {
    kind: "FORECAST_VS_BUDGET",
    direction,
    varianceAmountMinor: Math.abs(slice.rawDeltaMinor),
    varianceFormatted: formatFinanceManagementMoneyMinor(
      Math.abs(slice.rawDeltaMinor),
      input.baseCurrency,
      input.locale,
    ),
  };
}

export type FinanceReportingActualEvidenceReconciliation =
  | { kind: "RECONCILES"; entryCount: number; entriesTotalMinor: number }
  | { kind: "NOT_RECONCILING" }
  | { kind: "NOT_APPLICABLE" };

export function assessFinanceReportingActualEvidenceReconciliation(input: {
  actual: ManagementPnlMeasureCell;
  entries: ReadonlyArray<{ amountMinor: number }>;
}): FinanceReportingActualEvidenceReconciliation {
  if (input.entries.length === 0) return { kind: "NOT_APPLICABLE" };
  if (input.actual.availability !== "AVAILABLE" || input.actual.amountMinor === null) {
    return { kind: "NOT_RECONCILING" };
  }
  const entriesTotalMinor = input.entries.reduce((sum, e) => sum + e.amountMinor, 0);
  if (entriesTotalMinor !== input.actual.amountMinor) {
    return { kind: "NOT_RECONCILING" };
  }
  return {
    kind: "RECONCILES",
    entryCount: input.entries.length,
    entriesTotalMinor,
  };
}

export function financeReportingInvestigationVarianceRank(
  slice: FinanceReportingComparisonSlice,
): number {
  return slice.absoluteVarianceMagnitudeMinor ?? 0;
}

/** Neutral interpretation copy keys — favorability is shown separately (FIN-05B). */
export function financeReportingInvestigationInterpretationMessageKey(
  direction: "ABOVE" | "BELOW" | "ON_PLAN",
): "interpretationForecastOnBudget" | "interpretationForecastAboveBudget" | "interpretationForecastBelowBudget" {
  if (direction === "ON_PLAN") return "interpretationForecastOnBudget";
  if (direction === "ABOVE") return "interpretationForecastAboveBudget";
  return "interpretationForecastBelowBudget";
}

export function interpolateFinanceReportingMessage(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
