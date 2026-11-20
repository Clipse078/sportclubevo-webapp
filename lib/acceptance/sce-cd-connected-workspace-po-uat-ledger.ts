/**
 * PR #1017 — predictable Acceptance PO UAT fixture identities (sce_acceptance only).
 */

import { ACCEPTANCE_FIXTURE } from "@/lib/acceptance/bootstrap";

const PREFIX = "sce-acceptance-cd-po-1017-";

export const SCE_CD_CONNECTED_PO_UAT_TENANT_ID = ACCEPTANCE_FIXTURE.tenants.alpha.id;
export const SCE_CD_CONNECTED_PO_UAT_TENANT_KEY = ACCEPTANCE_FIXTURE.tenants.alpha.key;
export const SCE_CD_CONNECTED_PO_UAT_ACTOR_USER_ID = ACCEPTANCE_FIXTURE.users.alphaAdmin.id;

/** Child Org-Einheit for orgEinheit filter carry tests. */
export const SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID = `${PREFIX}org-junioren`;
export const SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_KEY = "junioren";

export const SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID = `${PREFIX}club-strategy`;
export const SCE_CD_CONNECTED_PO_UAT_TARGET_ID = `${PREFIX}target-ziel`;
export const SCE_CD_CONNECTED_PO_UAT_TARGET_TITLE =
  "PO UAT #1017 — Ziel für Aufgabe- und Rollup-Test" as const;

export const SCE_CD_CONNECTED_PO_UAT_SPRINT_ID = `${PREFIX}sprint-planung`;
export const SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG = "po-uat-vereinsentwicklung-planung" as const;
export const SCE_CD_CONNECTED_PO_UAT_SPRINT_TITLE =
  "PO UAT #1017 — Umsetzungsphase Planung" as const;

export const SCE_CD_CONNECTED_ACCEPTANCE_SEED_AUTHORIZATION =
  "sce-cd-connected-workspace-acceptance-seed:acceptance" as const;

export const SCE_CD_CONNECTED_ACCEPTANCE_SEED_CONFIRM =
  "SEED_CONNECTED_WORKSPACE_PO_UAT" as const;