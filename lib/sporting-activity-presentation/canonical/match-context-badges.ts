import type { SceMatchContextBadge, SceMatchPresentationModel } from "./types";
import { buildSceActivityPresentationStatus } from "./status";
import type { SceActivityPresentationStatus } from "./types";

export function buildSceMatchTenantSideContextBadge(
  homeAway: "HOME" | "AWAY" | null | undefined,
): SceMatchContextBadge | null {
  if (homeAway === "HOME") {
    return { kind: "tenant-side", label: "Heim" };
  }
  if (homeAway === "AWAY") {
    return { kind: "tenant-side", label: "Auswärts" };
  }
  return null;
}

const RESULT_PERSPECTIVE_LABELS = {
  WON: "Sieg",
  DRAW: "Unentschieden",
  LOST: "Niederlage",
  UNKNOWN: "",
} as const;

export type SceMatchResultPerspective = keyof typeof RESULT_PERSPECTIVE_LABELS;

export function buildSceMatchResultPerspectiveContextBadge(
  perspective: SceMatchResultPerspective,
): SceMatchContextBadge | null {
  const label = RESULT_PERSPECTIVE_LABELS[perspective]?.trim();
  if (!label) {
    return null;
  }

  return { kind: "result-perspective", label };
}

export function resolveSceMatchResultPerspectiveStatus(
  perspective: SceMatchResultPerspective,
): SceActivityPresentationStatus | null {
  const badge = buildSceMatchResultPerspectiveContextBadge(perspective);
  if (!badge) {
    return null;
  }

  const semantic =
    perspective === "WON"
      ? "active"
      : perspective === "LOST"
        ? "warning"
        : "neutral";

  return buildSceActivityPresentationStatus({
    domain: perspective.toLowerCase(),
    label: badge.label,
    semantic,
  });
}

export function withSceMatchContextBadges(
  model: SceMatchPresentationModel,
  badges: Array<SceMatchContextBadge | null | undefined>,
): SceMatchPresentationModel {
  const contextBadges = badges.filter(
    (badge): badge is SceMatchContextBadge => badge != null,
  );
  if (contextBadges.length === 0) {
    return model;
  }
  return { ...model, contextBadges };
}
