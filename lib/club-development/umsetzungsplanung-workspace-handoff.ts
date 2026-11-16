/**
 * PR #990 — Umsetzungsplanung workspace delivery ledger (no secrets).
 */

export const UMSETZUNGSPLANUNG_PULL_REQUEST = 990 as const;

/** Last verified Ready preview commit (update when Vercel Ready is re-checked). */
export const UMSETZUNGSPLANUNG_VERIFIED_PREVIEW_COMMIT =
  "d02d6ba8318e37f850a687514460b3afadbfd5d3" as const;
export const UMSETZUNGSPLANUNG_VERIFIED_PREVIEW_COMMIT_SHORT = "d02d6ba83" as const;

/**
 * Vercel project `sportclubevo-webapp-stage` — Ready deployment for PR #990 head
 * (GitHub Vercel check success on `d02d6ba83`, 2026-11-16 ~13:15 CET).
 */
export const UMSETZUNGSPLANUNG_VERIFIED_PREVIEW_URL =
  "https://sportclubevo-webapp-stage-git-curs-f53b4e-mds-projects-462da62c.vercel.app" as const;

/** Canonical STAGE branch deployment project on Vercel (verified via GitHub commit status on `origin/STAGE`). */
export const STAGE_VERCEL_PROJECT = "sportclubevo-webapp-stage" as const;

export const UMSETZUNGSPLANUNG_ACCEPTANCE_PATH =
  "/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen" as const;

export function buildUmsetzungsplanungAcceptanceUrl(previewBase: string): string {
  const base = previewBase.replace(/\/$/, "");
  return `${base}${UMSETZUNGSPLANUNG_ACCEPTANCE_PATH}`;
}