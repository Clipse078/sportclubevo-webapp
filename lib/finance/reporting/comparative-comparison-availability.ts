/**
 * FIN-05F — canonical comparison presentation roles (time-grain safe).
 * Reuses FIN-05B variance pairs; does not introduce alternate calculations.
 */

import { YTD_BUDGET_VARIANCE_SUPPORTED } from "@/lib/finance/actual/period-semantics";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";

export const FINANCE_COMPARATIVE_COMPARISON_KINDS = [
  "CURRENT_FORECAST_VS_APPROVED_BUDGET",
  "ACTUAL_VS_APPROVED_BUDGET",
  "ACTUAL_VS_CURRENT_FORECAST",
  "YTD_ACTUAL_VS_ANNUAL_APPROVED_BUDGET",
  "YTD_ACTUAL_VS_ANNUAL_CURRENT_FORECAST",
] as const;

export type FinanceComparativeComparisonKind =
  (typeof FINANCE_COMPARATIVE_COMPARISON_KINDS)[number];

/** Tenant-facing presentation role — not a variance calculation outcome. */
export type FinanceComparativePresentationRole = "SUPPORTED" | "CONTEXT_ONLY" | "UNSUPPORTED";

export type FinanceComparativeComparisonAvailabilityEntry = {
  kind: FinanceComparativeComparisonKind;
  role: FinanceComparativePresentationRole;
  /** Presentation-neutral hint for copy — resolved to i18n in presentation layer. */
  explanationKey: FinanceComparativeGrainExplanationKey | null;
};

export type FinanceComparativeGrainExplanationKey =
  | "YTD_ACTUAL_VS_ANNUAL_PLAN"
  | "ANNUAL_ACTUAL_AND_PLAN";

export function resolveComparativeComparisonPresentation(input: {
  kind: FinanceComparativeComparisonKind;
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null;
}): FinanceComparativeComparisonAvailabilityEntry {
  const grain = input.actualGrain ?? "ANNUAL_FULL_YEAR";

  switch (input.kind) {
    case "CURRENT_FORECAST_VS_APPROVED_BUDGET":
      return {
        kind: input.kind,
        role: "SUPPORTED",
        explanationKey: null,
      };
    case "ACTUAL_VS_APPROVED_BUDGET":
      if (grain === "YTD" && !YTD_BUDGET_VARIANCE_SUPPORTED) {
        return {
          kind: input.kind,
          role: "UNSUPPORTED",
          explanationKey: "YTD_ACTUAL_VS_ANNUAL_PLAN",
        };
      }
      return {
        kind: input.kind,
        role: "SUPPORTED",
        explanationKey: grain === "ANNUAL_FULL_YEAR" ? "ANNUAL_ACTUAL_AND_PLAN" : null,
      };
    case "ACTUAL_VS_CURRENT_FORECAST":
      return {
        kind: input.kind,
        role: "UNSUPPORTED",
        explanationKey: grain === "YTD" ? "YTD_ACTUAL_VS_ANNUAL_PLAN" : null,
      };
    case "YTD_ACTUAL_VS_ANNUAL_APPROVED_BUDGET":
    case "YTD_ACTUAL_VS_ANNUAL_CURRENT_FORECAST":
      if (grain === "YTD") {
        return {
          kind: input.kind,
          role: "CONTEXT_ONLY",
          explanationKey: "YTD_ACTUAL_VS_ANNUAL_PLAN",
        };
      }
      return {
        kind: input.kind,
        role: "UNSUPPORTED",
        explanationKey: null,
      };
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

export function buildComparativeComparisonAvailabilityMatrix(input: {
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null;
}): FinanceComparativeComparisonAvailabilityEntry[] {
  return FINANCE_COMPARATIVE_COMPARISON_KINDS.map((kind) =>
    resolveComparativeComparisonPresentation({ kind, actualGrain: input.actualGrain }),
  );
}

/** Maps FIN-05B slice availability to FIN-05F presentation role for Actual vs Budget variance exposure. */
export function resolveActualVsBudgetVariancePresentationRole(input: {
  actualGrain: "ANNUAL_FULL_YEAR" | "YTD" | null;
  varianceSlice: FinanceReportingComparisonSlice;
}): FinanceComparativePresentationRole {
  const declared = resolveComparativeComparisonPresentation({
    kind: "ACTUAL_VS_APPROVED_BUDGET",
    actualGrain: input.actualGrain,
  });
  if (declared.role === "UNSUPPORTED") return "UNSUPPORTED";
  if (input.varianceSlice.availability === "PERIOD_MISMATCH") return "UNSUPPORTED";
  if (input.varianceSlice.availability === "AVAILABLE") return "SUPPORTED";
  return declared.role;
}
