/**
 * PR #995 — Sitzungsmodus agenda timer delivery ledger (no secrets).
 */

export const SITZUNGSMODUS_PULL_REQUEST = 995 as const;

/** November acceptance meeting slug (timezone PO-accepted on branch). */
export const SITZUNGSMODUS_NOVEMBER_MEETING_SLUG = "vereinsleitungssitzung-november-2026" as const;

export const SITZUNGSMODUS_ACCEPTANCE_PATH =
  `/vereinsleitung/meetings/${SITZUNGSMODUS_NOVEMBER_MEETING_SLUG}` as const;

/** Updated after local `APPLY_DATABASE_MIGRATIONS=false npm run build` + Vercel Ready check. */
export const SITZUNGSMODUS_VERIFIED_PREVIEW_COMMIT =
  "bbd59227f0e81f4ac0f28540eca77c30e27a4ca7" as const;

export const SITZUNGSMODUS_VERIFIED_PREVIEW_COMMIT_SHORT = "bbd59227f" as const;

export const STAGE_VERCEL_PROJECT = "sportclubevo-webapp-stage" as const;

/**
 * Vercel Ready preview for PR #995 head (GitHub Vercel check success, 2026-11-16 ~23:44 CET).
 */
export const SITZUNGSMODUS_VERIFIED_PREVIEW_URL =
  "https://sportclubevo-webapp-stage-git-curs-15d836-mds-projects-462da62c.vercel.app" as const;

export function buildSitzungsmodusAcceptanceUrl(previewBase: string): string {
  const base = previewBase.replace(/\/$/, "");
  return `${base}${SITZUNGSMODUS_ACCEPTANCE_PATH}`;
}