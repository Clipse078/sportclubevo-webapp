/**
 * PR branch — Vereinsentwicklung Übersicht Zielboard sections (no secrets).
 */
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";
import { STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID } from "./sce-cd-connected-workspace-po-uat-handoff";

export const VEREINSENTWICKLUNG_OVERVIEW_PULL_REQUEST = 1021 as const;

export function buildVereinsentwicklungUebersichtPreviewUrl(
  previewBase: string,
  commitSha: string,
  orgUnitId?: string | null,
): string {
  const base = previewBase.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (orgUnitId?.trim()) {
    params.set(CD_WORKSPACE_ORG_UNIT_QUERY, orgUnitId.trim());
  }
  const shortSha = commitSha.slice(0, 12);
  params.set("dpl", shortSha);
  const q = params.toString();
  return q ? `${base}/vereinsleitung/club-entwicklung?${q}` : `${base}/vereinsleitung/club-entwicklung?dpl=${shortSha}`;
}

export function buildVereinsentwicklungOverviewHandoffUrls(previewBase: string, commitSha: string) {
  return {
    uebersichtUnfiltered: buildVereinsentwicklungUebersichtPreviewUrl(previewBase, commitSha, null),
    uebersichtJunioren: buildVereinsentwicklungUebersichtPreviewUrl(
      previewBase,
      commitSha,
      STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
    ),
  };
}

/** PO manual UAT — desktop 1280px; automation covers sort/scope; PO owns screenshots. */
export const VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280 = [
  "Übersicht at 1280px width: Strategien, Ziele, and Aufgaben appear directly under tabs (no Umsetzung aggregate block).",
  "Each section shows at most three compact desktop rows on one line; titles link to record destinations.",
  "Strategien rows show Zielerreichung only (copper progress bar + caption).",
  "Ziele rows show Aufgabenfortschritt with status pill and Verantwortlich.",
  "Aufgaben rows show Status, Verantwortlich, and linked Ziel (no row progress bar).",
  "Header «Alle anzeigen» in each section opens the matching workspace with the same orgEinheit filter when set.",
  "Handlungsbedarf, Nächste Sitzung, and Verein in Zahlen remain below the three preview lists.",
  "Repeat with orgEinheit=Junioren — scoped lists and scoped «Alle anzeigen» links only.",
] as const;