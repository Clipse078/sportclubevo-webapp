/**
 * PR #990 — Umsetzungsplanung workspace delivery ledger (no secrets).
 */

export const UMSETZUNGSPLANUNG_PULL_REQUEST = 990 as const;

/** Last verified Ready preview commit (update when Vercel Ready is re-checked). */
export const UMSETZUNGSPLANUNG_VERIFIED_PREVIEW_COMMIT = "e8e15dd6f362f35bc1c75b895d9a9e820d45cf5c" as const;
export const UMSETZUNGSPLANUNG_VERIFIED_PREVIEW_COMMIT_SHORT = "e8e15dd6" as const;

/**
 * Vercel project `sportclubevo-webapp-stage` — Ready deployment for PR #990 head
 * (GitHub Vercel check + vercel[bot] comment, 2026-11-16 ~12:04 CET).
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