/**
 * PR #995 — Sitzungsmodus agenda timer delivery ledger (no secrets).
 */

export const SITZUNGSMODUS_PULL_REQUEST = 995 as const;

/** November acceptance meeting slug (timezone PO-accepted on branch). */
export const SITZUNGSMODUS_NOVEMBER_MEETING_SLUG = "vereinsleitungssitzung-november-2026" as const;

export const SITZUNGSMODUS_ACCEPTANCE_PATH =
  `/vereinsleitung/meetings/${SITZUNGSMODUS_NOVEMBER_MEETING_SLUG}` as const;

/** Updated after local `APPLY_DATABASE_MIGRATIONS=false npm run build` + Vercel Ready check. */
export const SITZUNGSMODUS_VERIFIED_PREVIEW_COMMIT = "" as const;

export const STAGE_VERCEL_PROJECT = "sportclubevo-webapp-stage" as const;

export function buildSitzungsmodusAcceptanceUrl(previewBase: string): string {
  const base = previewBase.replace(/\/$/, "");
  return `${base}${SITZUNGSMODUS_ACCEPTANCE_PATH}`;
}