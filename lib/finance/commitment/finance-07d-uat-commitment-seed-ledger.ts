/**
 * FIN-07D — controlled STAGE UAT commitment titles for PO threshold testing.
 */

import { FIN_07B_UAT_CLEANUP_TENANT_ID, FIN_07B_UAT_CLEANUP_TENANT_KEY } from "@/lib/finance/commitment/finance-07b-uat-commitment-cleanup-ledger";
import { iso4217MinorUnitsPerMajor } from "@/lib/finance/presentation/finance-money-presentation";

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

export type Fin07dUatAmountTriple = {
  belowMinor: number;
  exactMinor: number;
  aboveMinor: number;
};

/**
 * Boundary fixtures are one whole major currency unit below / at / above threshold.
 * Finance stores integer minor units (e.g. 100 Rappen per CHF); ±1 minor would not
 * survive whole-currency commitment ledger presentation.
 */
export function buildFin07dUatAmountsForThreshold(
  thresholdAmountMinor: number,
  currencyCode: string,
): Fin07dUatAmountTriple {
  const majorStep = iso4217MinorUnitsPerMajor(currencyCode);
  if (!Number.isInteger(thresholdAmountMinor) || thresholdAmountMinor < majorStep) {
    throw new Error(
      `UAT threshold must be at least one whole major unit (${majorStep} minor, got ${thresholdAmountMinor}).`,
    );
  }
  if (thresholdAmountMinor % majorStep !== 0) {
    throw new Error(
      `UAT threshold must align to whole major units for boundary fixtures (got ${thresholdAmountMinor} minor).`,
    );
  }
  return {
    belowMinor: thresholdAmountMinor - majorStep,
    exactMinor: thresholdAmountMinor,
    aboveMinor: thresholdAmountMinor + majorStep,
  };
}

export function verifyFin07dUatEconomicBoundary(input: {
  belowMinor: number;
  exactMinor: number;
  aboveMinor: number;
  thresholdMinor: number;
}): {
  belowLtThreshold: boolean;
  exactEqThreshold: boolean;
  aboveGtThreshold: boolean;
} {
  return {
    belowLtThreshold: input.belowMinor < input.thresholdMinor,
    exactEqThreshold: input.exactMinor === input.thresholdMinor,
    aboveGtThreshold: input.aboveMinor > input.thresholdMinor,
  };
}

export function resolveFin07dUatPreferredThresholdMinor(_baseCurrency: string): number {
  void _baseCurrency;
  return FIN_07D_UAT_PREFERRED_THRESHOLD_MAJOR * 100;
}
