/**
 * FIN-07C — controlled STAGE UAT commitment titles for PO approval testing.
 */

import { FIN_07B_UAT_CLEANUP_TENANT_ID, FIN_07B_UAT_CLEANUP_TENANT_KEY } from "@/lib/finance/commitment/finance-07b-uat-commitment-cleanup-ledger";

export const FIN_07C_UAT_SEED_TENANT_KEY = FIN_07B_UAT_CLEANUP_TENANT_KEY;
export const FIN_07C_UAT_SEED_TENANT_ID = FIN_07B_UAT_CLEANUP_TENANT_ID;

export const FIN_07C_UAT_PENDING_APPROVAL_TITLE = "UAT — FIN-07C Freigabe" as const;
export const FIN_07C_UAT_REJECTION_TITLE = "UAT — FIN-07C Ablehnung" as const;

export const FIN_07C_UAT_CONTROLLED_COMMITMENTS = [
  {
    title: FIN_07C_UAT_PENDING_APPROVAL_TITLE,
    amountMinor: 1_500_00,
    currency: "CHF",
    partyName: "UAT Lieferant Freigabe",
    purpose: "PO approval path",
  },
  {
    title: FIN_07C_UAT_REJECTION_TITLE,
    amountMinor: 750_00,
    currency: "CHF",
    partyName: "UAT Lieferant Ablehnung",
    purpose: "PO rejection path",
  },
] as const;
