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

/** Exact allowlist only — no broad title predicates at execute time. */
export const FIN_07C_UAT_CONTROLLED_COMMITMENTS = [
  {
    id: "cmvr9bazg00003kjsbfza915p",
    title: FIN_07C_UAT_PENDING_APPROVAL_TITLE,
    uatSessionDateIso: "2026-10-27",
  },
  {
    id: "cmvr9bbl100043kjslc4tmzr0",
    title: FIN_07C_UAT_REJECTION_TITLE,
    uatSessionDateIso: "2026-10-27",
  },
] as const;

export const FIN_07C_UAT_CONTROLLED_COMMITMENT_IDS = FIN_07C_UAT_CONTROLLED_COMMITMENTS.map(
  (row) => row.id,
);

export const FIN_07C_UAT_CONTROLLED_COMMITMENT_TITLES = [
  FIN_07C_UAT_PENDING_APPROVAL_TITLE,
  FIN_07C_UAT_REJECTION_TITLE,
] as const;
