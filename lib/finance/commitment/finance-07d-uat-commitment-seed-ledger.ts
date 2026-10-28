/**
 * FIN-07D — controlled STAGE UAT commitment titles for PO threshold testing.
 */

import { FIN_07B_UAT_CLEANUP_TENANT_ID, FIN_07B_UAT_CLEANUP_TENANT_KEY } from "@/lib/finance/commitment/finance-07b-uat-commitment-cleanup-ledger";

export const FIN_07D_UAT_SEED_TENANT_KEY = FIN_07B_UAT_CLEANUP_TENANT_KEY;
export const FIN_07D_UAT_SEED_TENANT_ID = FIN_07B_UAT_CLEANUP_TENANT_ID;

export const FIN_07D_UAT_BELOW_THRESHOLD_TITLE = "UAT — FIN-07D Below Threshold" as const;
export const FIN_07D_UAT_EXACT_THRESHOLD_TITLE = "UAT — FIN-07D Exact Threshold" as const;
export const FIN_07D_UAT_ABOVE_THRESHOLD_TITLE = "UAT — FIN-07D Above Threshold" as const;

/** Preferred UAT threshold in major currency units when seed must create a policy row. */
export const FIN_07D_UAT_PREFERRED_THRESHOLD_MAJOR = 1_000;

export const FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES = [
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
] as const;

export type Fin07dUatCommitmentSpec = {
  title: (typeof FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES)[number];
  partyName: string;
  purpose: string;
};

export const FIN_07D_UAT_COMMITMENT_SPECS: Fin07dUatCommitmentSpec[] = [
  {
    title: FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
    partyName: "UAT Lieferant Unter Schwelle",
    purpose: "Submit → NOT_REQUIRED (below threshold)",
  },
  {
    title: FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
    partyName: "UAT Lieferant Exakte Schwelle",
    purpose: "Submit → PENDING (inclusive >= boundary)",
  },
  {
    title: FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
    partyName: "UAT Lieferant Über Schwelle",
    purpose: "Submit → PENDING (above threshold)",
  },
];

/** Set by seed when a new tenant policy row is created solely for FIN-07D UAT. */
export const FIN_07D_UAT_POLICY_CLEANUP = {
  createdForUatOnly: true,
  policyId: "cmvs1k8ol000072jsgev62ahh",
};

export function buildFin07dUatAmountsForThreshold(thresholdAmountMinor: number): {
  belowMinor: number;
  exactMinor: number;
  aboveMinor: number;
} {
  if (!Number.isInteger(thresholdAmountMinor) || thresholdAmountMinor < 100) {
    throw new Error(
      `UAT threshold must be at least 100 minor units (got ${thresholdAmountMinor}).`,
    );
  }
  return {
    belowMinor: thresholdAmountMinor - 1,
    exactMinor: thresholdAmountMinor,
    aboveMinor: thresholdAmountMinor + 1,
  };
}

export function resolveFin07dUatPreferredThresholdMinor(_baseCurrency: string): number {
  void _baseCurrency;
  return FIN_07D_UAT_PREFERRED_THRESHOLD_MAJOR * 100;
}
