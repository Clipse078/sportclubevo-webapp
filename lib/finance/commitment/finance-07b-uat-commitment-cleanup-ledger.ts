/**
 * FIN-07B R6 — controlled STAGE UAT commitment identifiers (PO visual UAT session).
 * Exact allowlist only — no broad title predicates at execute time.
 */

export const FIN_07B_UAT_CLEANUP_TENANT_KEY = "fc-allschwil" as const;

/** Resolved STAGE tenant id for fc-allschwil (programme tenant). */
export const FIN_07B_UAT_CLEANUP_TENANT_ID = "cmomwboak0000tsf3zzivrs46" as const;

export const FIN_07B_UAT_CONTROLLED_COMMITMENTS = [
  {
    id: "cmvqpk79n000008k0xmmawcn0",
    title: "UAT — Hallenturniere Winter",
    uatSessionDateIso: "2026-10-27",
  },
  {
    id: "cmvr80qoe000008jv2g20fsni",
    title: "TEST 2",
    uatSessionDateIso: "2026-10-27",
  },
] as const;

export const FIN_07B_UAT_CONTROLLED_COMMITMENT_IDS = FIN_07B_UAT_CONTROLLED_COMMITMENTS.map(
  (row) => row.id,
);

export const FIN_07B_UAT_CONTROLLED_COMMITMENT_TITLES = FIN_07B_UAT_CONTROLLED_COMMITMENTS.map(
  (row) => row.title,
);
