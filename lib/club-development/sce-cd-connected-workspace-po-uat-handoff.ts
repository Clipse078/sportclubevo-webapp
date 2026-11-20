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

export const CONNECTED_WORKSPACE_PO_UAT_HANDOFF = {
  /** Vercel Custom Environment `acceptance` — canonical PO UAT hostname (isolated sce_acceptance). */
  acceptanceCommit: "7b7c64b4c0a5c9f376ea9ee85a8cdd5cd9eb7ff4",
  acceptanceCommitShort: "7b7c64b4",
  acceptanceDeploymentId: "dpl_HuJs7s5vbPDwh12w7sZgGrRUWmVH",
  acceptanceOrigin: CONNECTED_WORKSPACE_ACCEPTANCE_ORIGIN,
  /** STAGE-backed PR Preview — not a valid PO UAT target (shared STAGE DB, no connected-workspace migration). */
  readyPreviewCommit: "e21aa6dfd",
  readyPreviewCommitShort: "e21aa6df",
  readyPreviewDeploymentId: "4QsKeWb3WaFiZHv5sCUvMoZ3evZF",
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
  aufgaben: string;
  umsetzungsplanung: string;
  targetDetail: string;
  ungeplantBacklog: string;
  sprintBoard: string;
};

export function buildConnectedWorkspacePoUatHandoffUrls(
  previewBase: string,
  orgUnitId: string = SCE_CD_CONNECTED_PO_UAT_ORG_UNIT_ID,
): ConnectedWorkspacePoUatUrls {
  const base = previewBase.replace(/\/$/, "");
  const orgQuery = `${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(orgUnitId)}`;

  return {
    uebersicht: `${base}/vereinsleitung/club-entwicklung?${orgQuery}`,
    strategien: `${base}/vereinsleitung/strategie-und-ziele?ansicht=strategie&${orgQuery}`,
    ziele: `${base}/vereinsleitung/strategie-und-ziele?ansicht=ziele&${orgQuery}`,
    aufgaben: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=aufgaben&${orgQuery}`,
    umsetzungsplanung: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${orgQuery}`,
    targetDetail: `${base}/vereinsleitung/targets/${encodeURIComponent(SCE_CD_CONNECTED_PO_UAT_TARGET_ID)}?${orgQuery}`,
    ungeplantBacklog: `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${CD_UMSETZUNGSPLANUNG_SECTION_QUERY}=ungeplant&${orgQuery}`,
    sprintBoard: `${base}/vereinsleitung/sprints/${encodeURIComponent(SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG)}/board`,
  };
}

/** Six PO-owned screenshots (visual baseline — attach to PR #1017 by PO). */
export const CONNECTED_WORKSPACE_PO_SCREENSHOT_BASELINE = [
  "01-mega-menu-five-views.png",
  "02-uebersicht-junioren-filter-tabs.png",
  "03-strategien-club-row.png",
  "04-ziele-anlegen-empty.png",
  "05-aufgaben-target-row.png",
  "06-umsetzungsplanung-ungeplant-sprint-progress.png",
] as const;

/** Ordered screenshot checklist for PO manual UAT (no automation). */
export const CONNECTED_WORKSPACE_PO_SCREENSHOT_CHECKLIST = [
  "1. Login as Acceptance Alpha Club Admin on https://acceptance.sportclubevo.com (Vercel Deployment Protection, then club-admin-alpha@acceptance.sportclubevo.com).",
  "2. Verein → Vereinsentwicklung: capture mega-menu — five entries (Übersicht, Strategien, Ziele, Aufgaben, Umsetzungsplanung) with matching tab strip.",
  "3. Übersicht with orgEinheit filter → switch through all five tabs; confirm filter carries.",
  "4. Strategien: confirm club-wide strategy row (title PO UAT #1017) shows linked Schwerpunkt-Ziel.",
  "5. Ziele → open fixture Ziel → inline «Aufgabe erstellen»; save new Aufgabe (PO-created).",
  "6. Aufgaben view: confirm new Aufgabe listed.",
  "7. Umsetzungsplanung → Ungeplant section: confirm Aufgabe appears unplanned.",
  "8. Schedule Aufgabe into fixture sprint «po-uat-vereinsentwicklung-planung» from board/planning UI.",
  "9. Sprint board: mark Aufgabe Erledigt; capture status change.",
  "10. Return to Ziel detail + Übersicht: capture progress / rollup labels updated.",
  "11. Strategien tab: capture delivery progress panel reflects completed task leaf.",
] as const;