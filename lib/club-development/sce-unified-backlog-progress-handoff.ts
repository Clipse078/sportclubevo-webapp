/**
 * PR #1020 — Umsetzungsplanung scheduling UX handoff (no secrets).
 */
import { CD_UMSETZUNGSPLANUNG_SECTION_QUERY } from "./vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";
import { STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID } from "./sce-cd-connected-workspace-po-uat-handoff";

export const UNIFIED_BACKLOG_PROGRESS_PULL_REQUEST = 1020 as const;

export const UNIFIED_BACKLOG_PROGRESS_PO_HANDOFF = {
  pullRequest: UNIFIED_BACKLOG_PROGRESS_PULL_REQUEST,
  dataEnvironment:
    "Vercel `sportclubevo-webapp-stage` preview — shared STAGE database (read/write for scheduling APIs; no migrations in this PR).",
  juniorenOrgUnitId: STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID,
  eligiblePhaseNote:
    "Junioren STAGE scope typically has Laufend/Geplant Umsetzungsphasen when sprint rows exist; if all groups are empty, Ungeplant reorder and the ⋯ empty-state still apply.",
} as const;

export function buildPr1020JuniorenUngeplantPreviewUrl(previewBase: string, commitSha: string): string {
  const base = previewBase.replace(/\/$/, "");
  const orgQuery = `${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID)}`;
  return `${base}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&${CD_UMSETZUNGSPLANUNG_SECTION_QUERY}=ungeplant&${orgQuery}&dpl=${commitSha.slice(0, 12)}`;
}

/** PO manual flow — automation covers variants; PO captures screenshots. */
export const PR_1020_PO_UAT_CHECKLIST = [
  "Ungeplant: short-click task title opens detail (no navigation after completed drag).",
  "Ungeplant: press–hold–move title or grip past threshold → drag ghost is task payload, not URL.",
  "Hover collapsed Laufend/Geplant section header → dwell opens group; phase card shows «+ Hier ablegen» on hover.",
  "Drop on phase → task disappears from Ungeplant immediately; reload keeps assignment; failed save restores list + error.",
  "⋯ menu: «In Umsetzungsphase verschieben» with Laufend/Geplant phase names as one-click actions.",
  "⋯ with zero destinations: menu opens, shows «Keine passende Umsetzungsphase verfügbar»; Ungeplant reorder still works.",
  "Scheduled task: ⋯ includes «Nach Ungeplant verschieben»; phase move excludes current phase.",
] as const;