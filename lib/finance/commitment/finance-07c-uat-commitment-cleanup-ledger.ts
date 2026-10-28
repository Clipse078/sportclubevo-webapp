/**
 * FIN-07C — controlled STAGE UAT commitment cleanup ledger (post PO UAT PASS).
 */

import {
  FIN_07C_UAT_PENDING_APPROVAL_TITLE,
  FIN_07C_UAT_REJECTION_TITLE,
  FIN_07C_UAT_SEED_TENANT_ID,
  FIN_07C_UAT_SEED_TENANT_KEY,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-seed-ledger";

export const FIN_07C_UAT_CLEANUP_TENANT_KEY = FIN_07C_UAT_SEED_TENANT_KEY;
export const FIN_07C_UAT_CLEANUP_TENANT_ID = FIN_07C_UAT_SEED_TENANT_ID;

/** Exact titles only — resolve ids at cleanup inventory time. */
export const FIN_07C_UAT_CONTROLLED_COMMITMENT_TITLES = [
  FIN_07C_UAT_PENDING_APPROVAL_TITLE,
  FIN_07C_UAT_REJECTION_TITLE,
] as const;
