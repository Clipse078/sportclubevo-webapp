/**
 * FIN-07D — controlled STAGE UAT cleanup ledger (post PO UAT PASS).
 */

import {
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_SEED_TENANT_ID,
  FIN_07D_UAT_SEED_TENANT_KEY,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";

export const FIN_07D_UAT_CLEANUP_TENANT_KEY = FIN_07D_UAT_SEED_TENANT_KEY;
export const FIN_07D_UAT_CLEANUP_TENANT_ID = FIN_07D_UAT_SEED_TENANT_ID;

/** Remove only when seed created this policy row (not pre-existing tenant policy). */
export const FIN_07D_UAT_CONTROLLED_POLICY = {
  policyId: "cmvs1k8ol000072jsgev62ahh",
  createdForUatOnly: true,
} as const;

export const FIN_07D_UAT_CONTROLLED_COMMITMENTS = [
  {
    id: "cmvs1k95z000272jsz2mxumud",
    title: FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
    uatSessionDateIso: "2026-10-28",
  },
  {
    id: "cmvs1k9k8000572js91yq3dra",
    title: FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
    uatSessionDateIso: "2026-10-28",
  },
  {
    id: "cmvs1k9yh000872jsxfbpkdso",
    title: FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
    uatSessionDateIso: "2026-10-28",
  },
] as const;

export const FIN_07D_UAT_CONTROLLED_COMMITMENT_IDS = FIN_07D_UAT_CONTROLLED_COMMITMENTS.map(
  (row) => row.id,
);

export const FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES = FIN_07D_UAT_CONTROLLED_COMMITMENTS.map(
  (row) => row.title,
);
