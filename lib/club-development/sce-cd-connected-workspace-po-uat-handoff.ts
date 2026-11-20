/**
 * PR #1017 — connected Vereinsentwicklung PO UAT ledger (no secrets).
 */

import { CD_UMSETZUNGSPLANUNG_SECTION_QUERY } from "./vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";
import {
  SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
  SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
  SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
  SCE_CD_CONNECTED_PO_UAT_TENANT_KEY,
  SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
} from "@/lib/acceptance/sce-cd-connected-workspace-po-uat-ledger";

export const CONNECTED_WORKSPACE_PULL_REQUEST = 1017 as const;

export const CONNECTED_WORKSPACE_ACCEPTANCE_ORIGIN =
  "https://acceptance.sportclubevo.com" as const;

/** FC Allschwil STAGE — Junioren orgEinheit filter for PR preview smoke URLs (read-only UAT). */
export const STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID = "cmslki2q4000104l87hu4qqbs" as const;

/** Shared STAGE record for identity + contextual Aufgabe create PO screenshots (read-only). */
export const STAGE_PREVIEW_TESTZIEL_I_ID = "cmwpanrjn000008l6jhpjhjb4" as const;

/** Shared STAGE record for hierarchy UAT (Ziel detail Aufgaben group + contextual create). */
export const STAGE_PREVIEW_TESTZIEL_III_ID = "cmwpapvn4000608l64zwx8dye" as const;

export const CONNECTED_WORKSPACE_PO_UAT_HANDOFF = {
  /** Vercel Custom Environment `acceptance` — canonical PO UAT hostname (isolated sce_acceptance). */
  acceptanceCommit: "7b7c64b4c0a5c9f376ea9ee85a8cdd5cd9eb7ff4",
  acceptanceCommitShort: "7b7c64b4",
  acceptanceDeploymentId: "dpl_HuJs7s5vbPDwh12w7sZgGrRUWmVH",
  acceptanceOrigin: CONNECTED_WORKSPACE_ACCEPTANCE_ORIGIN,
  /** STAGE-backed PR preview — read-only PO UAT (shared STAGE DB; connected-workspace migration applied). */
  readyPreviewCommit: "cc7770af04a39023fb5066120177b824c2bb19dc",
  readyPreviewCommitShort: "cc7770af0",
  readyPreviewDeploymentId: "4t9cc4f5cTEyVzoTwjGCRUH5pGLr",
  readyPreviewHostname:
    "sportclubevo-webapp-stage-git-curs-e07387-mds-projects-462da62c.vercel.app",
  readyPreviewAlias:
    "sportclubevo-webapp-stage-git-curs-e07387-mds-projects-462da62c.vercel.app",
  get readyPreviewOrigin(): string {
    return `https://${this.readyPreviewHostname}`;
  },
  stageSharedFingerprint: "acd3b37682911890",
  requiredMigration: "20261120120000_sce_cd_connected_workspace",
  /** Additive 1:n Org-Einheit — deploy after connected workspace migration. */
  orgUnitAssignmentMigration: "20261120140000_sce_cd_connected_strategy_org_units",
  acceptanceTenantSlug: SCE_CD_CONNECTED_PO_UAT_TENANT_KEY,
  fixture: {
    orgUnitId: SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
    clubStrategyId: SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
    targetId: SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
    sprintSlug: SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
  },
} as const;

export type ConnectedWorkspacePoUatUrls = {
  uebersicht: string;
  strategien: string;
  ziele: string;
  neueStrategie: string;
  neuesZiel: string;
  neueAufgabeReference: string;
  aufgaben: string;
  umsetzungsplanung: string;
  targetDetail: string;
  ungeplantBacklog: string;
  sprintBoard: string;
  zielNeuFromGesamtvereinStrategie: string;
  stageTestzielIDetail: string;
  stageTestzielITaskCreate: string;
  stageTestzielIIIDetail: string;
  stageTestzielIIITaskCreate: string;
};

export function buildConnectedWorkspacePoUatHandoffUrls(
  previewBase: string,
  orgUnitId: string = STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
): ConnectedWorkspacePoUatUrls {
  const base = previewBase.replace(/\/$/, "");
  const orgQuery = `${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(orgUnitId)}`;

  const clubStrategyId = SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID;
  return {
    uebersicht: `${base}/vereinsleitung/club-entwicklung?${orgQuery}`,
    strategien: `${base}/vereinsleitung/strategie-und-ziele?ansicht=strategie&${orgQuery}`,
    ziele: `${base}/vereinsleitung/strategie-und-ziele?ansicht=ziele&${orgQuery}`,
    neueStrategie: `${base}/vereinsleitung/strategie-und-ziele/strategie/neu?${orgQuery}`,
    neuesZiel: `${base}/vereinsleitung/strategie-und-ziele/ziele/neu?${orgQuery}`,
    neueAufgabeReference: `${base}/dashboard/aufgaben/neu`,
    zielNeuFromGesamtvereinStrategie: `${base}/vereinsleitung/strategie-und-ziele/ziele/neu?${orgQuery}&clubStrategyId=${encodeURIComponent(clubStrategyId)}&linkFocus=1`,
    aufgaben: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=aufgaben&${orgQuery}`,
    umsetzungsplanung: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${orgQuery}`,
    targetDetail: `${base}/vereinsleitung/targets/${encodeURIComponent(SCE_CD_CONNECTED_PO_UAT_TARGET_ID)}?${orgQuery}`,
    ungeplantBacklog: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${CD_UMSETZUNGSPLANUNG_SECTION_QUERY}=ungeplant&${orgQuery}`,
    sprintBoard: `${base}/vereinsleitung/sprints/${encodeURIComponent(SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG)}/board`,
    stageTestzielIDetail: `${base}/vereinsleitung/targets/${encodeURIComponent(STAGE_PREVIEW_TESTZIEL_I_ID)}?${orgQuery}`,
    stageTestzielITaskCreate: `${base}/dashboard/aufgaben/neu?contextType=TARGET&contextId=${encodeURIComponent(STAGE_PREVIEW_TESTZIEL_I_ID)}&returnTo=${encodeURIComponent(`${base}/vereinsleitung/targets/${STAGE_PREVIEW_TESTZIEL_I_ID}?${orgQuery}`)}&${orgQuery}`,
    stageTestzielIIIDetail: `${base}/vereinsleitung/targets/${encodeURIComponent(STAGE_PREVIEW_TESTZIEL_III_ID)}?${orgQuery}`,
    stageTestzielIIITaskCreate: `${base}/dashboard/aufgaben/neu?contextType=TARGET&contextId=${encodeURIComponent(STAGE_PREVIEW_TESTZIEL_III_ID)}&returnTo=${encodeURIComponent(`${base}/vereinsleitung/targets/${STAGE_PREVIEW_TESTZIEL_III_ID}?${orgQuery}`)}&${orgQuery}`,
  };
}

/**
 * PO side-by-side checklist (same viewport: Übersicht first, then the four working tabs).
 * Capture heading, tab strip, workspace toolbar (org chip + filters + primary action), and first list rows or empty state.
 */
export const CONNECTED_WORKSPACE_PO_SCREENSHOT_BASELINE = [
  "01-uebersicht-junioren-toolbar.png",
  "02-strategien-list-toolbar.png",
  "03-ziele-list-toolbar.png",
  "04-aufgaben-list-toolbar.png",
  "05-umsetzungsplanung-phase-groups.png",
  "06-strategie-detail-ziele-group.png",
  "07-ziel-detail-aufgaben-group.png",
  "08-umsetzungsphase-menu-bearbeiten.png",
] as const;

/** Ordered screenshot checklist for PO manual UAT (no automation). */
export const CONNECTED_WORKSPACE_PO_SCREENSHOT_CHECKLIST = [
  "1. STAGE PR preview (read-only UAT): set desktop width + zoom on Übersicht first; apply orgEinheit=Junioren (cmslki2q4000104l87hu4qqbs).",
  "2. Capture Übersicht — page chrome, five tabs, toolbar with Junioren chip only.",
  "3. Without changing width/zoom, capture Strategien — toolbar «+ Strategie anlegen», column headers, first strategy row (label blocked if no rows).",
  "4. Capture Ziele — toolbar «+ Ziel anlegen», compact list or empty state.",
  "5. Capture Aufgaben — toolbar search/filters, «+ Aufgabe erstellen», task table or differentiated empty state.",
  "6. Capture Umsetzungsplanung — single search, «+ Umsetzungsphase erstellen», phase group headers + Ungeplant.",
  "7. Open strategy by title: capture Ziele group with create/link (blocked if no strategy).",
  "8. Open Ziel detail: capture Aufgaben group with create/link.",
  "9. Umsetzungsphase «…» → «Umsetzungsphase bearbeiten» (blocked if no phase).",
  "10. Ziele list — no row «…» menu / no «Aufgabe erstellen»; Testziel I row shows «Verantwortlich» «Nicht zugewiesen»; clickable Strategie link when linked.",
  "11. Testziel III detail (/targets/cmwpapvn4000608l64zwx8dye) — linked Strategie, Aufgaben group with «+ Aufgabe erstellen» even when empty; Umsetzungsfortschritt caption (x von y or «Noch keine Aufgaben»).",
  "12. Contextual Neue Aufgabe from Testziel III — TARGET context with Ziel name; save returns to Aufgaben group with Junioren filter.",
  "13. Strategie detail — Ziele group rows with Umsetzungsfortschritt bar + «x von y Aufgaben erledigt» for existing data (flag if preview lacks tasks).",
] as const;