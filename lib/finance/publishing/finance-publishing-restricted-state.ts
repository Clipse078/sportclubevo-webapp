/**
 * FIN-06A — uniform restricted responses without metadata leakage.
 */

export type FinancePublishingRestrictedSurface = "PUBLICATION" | "SHARE" | "FOUNDATION";

export type FinancePublishingRestrictedState = {
  surface: FinancePublishingRestrictedSurface;
  availability: "RESTRICTED";
  /** No totals, titles, or scope hints when unauthorized. */
  leakFinancialMetadata: false;
};

export function financePublishingRestrictedState(
  surface: FinancePublishingRestrictedSurface,
): FinancePublishingRestrictedState {
  return {
    surface,
    availability: "RESTRICTED",
    leakFinancialMetadata: false,
  };
}
