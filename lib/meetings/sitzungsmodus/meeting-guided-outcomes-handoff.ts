/**
 * Dependent PR — guided Sitzungsmodus outcomes (stacks on PR #995).
 */

export const GUIDED_OUTCOMES_BASE_PULL_REQUEST = 995 as const;
export const GUIDED_OUTCOMES_BASE_BRANCH = "cursor/meeting-agenda-timer-37e5" as const;

/** Verified against remote head before branching (Europe/Zurich acceptance path unchanged). */
export const GUIDED_OUTCOMES_BASE_HEAD_SHA = "61055417be21ab7ed31ac7c365dfa4d5dd94f4c8" as const;

/** November acceptance path (inherits timezone PO sign-off from #995 base). */
export const GUIDED_OUTCOMES_ACCEPTANCE_PATH =
  "/vereinsleitung/meetings/vereinsleitungssitzung-november-2026" as const;

/** Updated after push + Vercel Ready check on this branch head. */
export const GUIDED_OUTCOMES_PULL_REQUEST = 997 as const;

export const GUIDED_OUTCOMES_VERIFIED_HEAD_SHA = "94e43b3e03b9406d38d9271c0d063fc450ea94cd" as const;

export const GUIDED_OUTCOMES_VERIFIED_PREVIEW_URL =
  "https://sportclubevo-webapp-stage-git-curs-9eff96-mds-projects-462da62c.vercel.app" as const;

export function buildGuidedOutcomesAcceptanceUrl(previewBase: string): string {
  return `${previewBase.replace(/\/$/, "")}${GUIDED_OUTCOMES_ACCEPTANCE_PATH}`;
}