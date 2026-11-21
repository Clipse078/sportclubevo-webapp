/**
 * PR branch — Vereinsentwicklung Übersicht Zielboard sections (no secrets).
 */
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";
import { STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID } from "./sce-cd-connected-workspace-po-uat-handoff";
import {
  CD_UMSETZUNGSPLANUNG_SECTION_QUERY,
  buildStrategieUndZieleHref,
  buildVorhabenUndUmsetzungHref,
} from "./vereinsentwicklung-workspace-routing";

export const VEREINSENTWICKLUNG_OVERVIEW_PULL_REQUEST = 1023 as const;

/** STAGE-backed PR preview hostname (commit-bound `dpl` query). */
export const VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_ORIGIN =
  "https://sportclubevo-webapp-stage-git-curs-e07387-mds-projects-462da62c.vercel.app" as const;

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
  const shortSha = commitSha.slice(0, 12);
  const base = previewBase.replace(/\/$/, "");
  const dpl = `dpl=${shortSha}`;
  const juniorenQuery = `${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID)}`;

  const withDpl = (pathAndQuery: string) =>
    pathAndQuery.includes("?") ? `${base}${pathAndQuery}&${dpl}` : `${base}${pathAndQuery}?${dpl}`;

  const strategieJunioren = buildStrategieUndZieleHref("strategie", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  });
  const zieleJunioren = buildStrategieUndZieleHref("ziele", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  });
  const aufgabenJunioren = buildVorhabenUndUmsetzungHref("aufgaben", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  });
  const umsetzungJunioren = buildVorhabenUndUmsetzungHref("umsetzungsphasen", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  });
  const ungeplantJunioren = `${buildVorhabenUndUmsetzungHref("umsetzungsphasen", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  })}&${CD_UMSETZUNGSPLANUNG_SECTION_QUERY}=ungeplant`;

  return {
    uebersichtUnfiltered: buildVereinsentwicklungUebersichtPreviewUrl(previewBase, commitSha, null),
    uebersichtJunioren: buildVereinsentwicklungUebersichtPreviewUrl(
      previewBase,
      commitSha,
      STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
    ),
    strategieJunioren: withDpl(strategieJunioren),
    zieleJunioren: withDpl(zieleJunioren),
    aufgabenJunioren: withDpl(aufgabenJunioren),
    umsetzungsphasenJunioren: withDpl(umsetzungJunioren),
    umsetzungJuniorenUngeplant: withDpl(ungeplantJunioren),
  };
}

/** PO manual UAT — desktop 1280px; automation covers sort/scope; PO owns screenshots. */
export const VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280 = [
  "At 1280×900 CSS px: section headings for Strategien, Ziele, and Aufgaben visible without scroll; first Aufgaben row visible.",
  "Referenz, Titel, Kontext, Status, Fortschritt, Verantwortlich, and action menu share one column track across all three sections.",
  "Empty progress or status cells reserve grid space only (no em-dash placeholders).",
  "Strategien: Org-Einheit + Zielerreichung; Ziele: Strategie + Aufgabenfortschritt + status pill; Aufgaben: Ziel, no row progress bar.",
  "Nested panel cards removed; rows flush with light section header and «Alle anzeigen» right-aligned.",
  "Handlungsbedarf and Nächste Sitzung use compact divided rows below the Zielboard.",
  "Header «Alle anzeigen» preserves orgEinheit scope; Junioren filter smoke on scoped lists and links.",
] as const;