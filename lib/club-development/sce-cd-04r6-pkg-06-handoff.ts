/**
 * SCE-CD-04R6 PKG-06 — verified preview + PO acceptance path ledger (no secrets).
 */

export const PKG_06_PULL_REQUEST = 985 as const;

export const PKG_06_VERIFIED_PREVIEW_COMMIT = "e5e3f98c1f96809fd52b891aa9ceb175fc927b14" as const;
export const PKG_06_VERIFIED_PREVIEW_COMMIT_SHORT = "e5e3f98c" as const;

/** Vercel Ready deployment for PR #985 head (verified 2026-11-16T06:27Z UTC, exact SHA e5e3f98c). */
export const PKG_06_VERIFIED_PREVIEW_URL =
  "https://sportclubevo-webapp-stage-git-curs-87ffcf-mds-projects-462da62c.vercel.app" as const;

/** STAGE has no COMPLETED Umsetzungsphase in tenant data — PO Rückblick walkthrough remains pending. */
export const PKG_06_STAGE_COMPLETED_SPRINT_SLUG: string | null = null;

/** Agreed Umsetzungsphasen scheduling policy — root parent tasks only; subtasks stay on parent. */
export const PKG_06_PARENT_TASK_ONLY_PHASE_PLANNING_POLICY =
  "Umsetzungsphasen schedule root tasks only (parentTaskId: null). Unteraufgaben are managed under the parent task in the Aufgaben workspace; they are not independently planned into sprints unless PKG-04 explicitly changes rootsOnly." as const;

export type Pkg06PoAcceptancePaths = {
  vorhabenInlineCreate: string;
  vorhabenPrioritaetenInlineCreate: string;
  zielAutoLinkCreate: (targetId: string) => string;
  umsetzungsphasenWorkspace: string;
  sprintAufgabenboard: (sprintSlug: string) => string;
  sprintRueckblick: (sprintSlug: string) => string;
};

export function buildPkg06PoAcceptancePaths(): Pkg06PoAcceptancePaths {
  return {
    vorhabenInlineCreate: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben",
    vorhabenPrioritaetenInlineCreate:
      "/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben&prioritaeten=1",
    zielAutoLinkCreate: (targetId: string) =>
      `/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben&targetId=${encodeURIComponent(targetId)}`,
    umsetzungsphasenWorkspace: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen",
    sprintAufgabenboard: (sprintSlug: string) =>
      `/vereinsleitung/sprints/${encodeURIComponent(sprintSlug)}/board`,
    sprintRueckblick: (sprintSlug: string) =>
      `/vereinsleitung/sprints/${encodeURIComponent(sprintSlug)}/rueckblick`,
  };
}

export function buildPkg06PoAcceptanceAbsoluteUrl(previewBase: string, path: string): string {
  const base = previewBase.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}