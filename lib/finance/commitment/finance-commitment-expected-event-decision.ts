/**
 * FIN-07B explicit expected-event integration decision (architecture doc §18).
 *
 * Deferred to FIN-07F: manual expected-event services still assume MANUAL sourceKind,
 * and commitment activation without FIN-04E reconciliation guards risks duplicate timing
 * evidence when financialAccountId is optional on commitments.
 */
export const FINANCE_COMMITMENT_07B_EXPECTED_EVENT_DECISION = {
  synchronizeOnActive: false,
  deferredTo: "FIN-07F",
  reason:
    "Commitment-sourced FinanceExpectedFinancialEvent sync requires FIN-04E source-owned mutation rules and FIN-07F intelligence — not safe to enable in 07B.",
} as const;
