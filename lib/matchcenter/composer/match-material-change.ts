import type { MatchComposerDraftPayload } from "./match-composer-draft-types";

export type MatchMaterialChangeCategory =
  | "ORGANISATIONAL_AUDIENCE"
  | "SCHEDULE"
  | "LOCATION"
  | "RESOURCES"
  | "PUBLICATION";

export function classifyMatchMaterialChanges(
  baseline: MatchComposerDraftPayload,
  next: MatchComposerDraftPayload,
): MatchMaterialChangeCategory[] {
  const changed: MatchMaterialChangeCategory[] = [];
  if (baseline.teamId !== next.teamId || baseline.homeAway !== next.homeAway) {
    changed.push("ORGANISATIONAL_AUDIENCE");
  }
  if (baseline.startAt !== next.startAt || baseline.endAt !== next.endAt) {
    changed.push("SCHEDULE");
  }
  if (baseline.location !== next.location) {
    changed.push("LOCATION");
  }
  if (JSON.stringify(baseline.resources) !== JSON.stringify(next.resources)) {
    changed.push("RESOURCES");
  }
  if (JSON.stringify(baseline.publication) !== JSON.stringify(next.publication)) {
    changed.push("PUBLICATION");
  }
  return changed;
}
