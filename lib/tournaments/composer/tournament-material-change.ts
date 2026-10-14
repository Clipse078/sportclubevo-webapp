import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

export type TournamentMaterialChangeCategory =
  | "ORGANISATIONAL_AUDIENCE"
  | "SCHEDULE"
  | "LOCATION"
  | "RESOURCES"
  | "PUBLICATION";

export function classifyTournamentMaterialChanges(
  baseline: TournamentComposerDraftPayload,
  next: TournamentComposerDraftPayload,
): TournamentMaterialChangeCategory[] {
  const changed: TournamentMaterialChangeCategory[] = [];
  if (
    baseline.homeAway !== next.homeAway ||
    JSON.stringify(baseline.participants) !== JSON.stringify(next.participants)
  ) {
    changed.push("ORGANISATIONAL_AUDIENCE");
  }
  if (baseline.startAt !== next.startAt || baseline.endAt !== next.endAt) {
    changed.push("SCHEDULE");
  }
  if (baseline.location !== next.location) {
    changed.push("LOCATION");
  }
  if (
    JSON.stringify(baseline.resourceAllocations) !== JSON.stringify(next.resourceAllocations)
  ) {
    changed.push("RESOURCES");
  }
  if (JSON.stringify(baseline.publication) !== JSON.stringify(next.publication)) {
    changed.push("PUBLICATION");
  }
  return changed;
}
