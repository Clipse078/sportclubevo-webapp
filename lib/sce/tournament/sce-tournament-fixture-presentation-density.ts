import type { ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import type { SceTournamentFixturePresentationDensity } from "@/components/sce/tournament/SceTournamentFixturePresentation";

/** Match-card identity density for tournament fixture presentation tiers. */
export function matchIdentityDensityForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): Extract<SceActivityPresentationDensity, "STANDARD" | "COMPACT"> {
  return density === "standard" ? "STANDARD" : "COMPACT";
}

/** Optional crest override — default scales come from match identity density. */
export function crestVisualSizeOverrideForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): ClubCrestVisualSize | undefined {
  switch (density) {
    case "standard":
      return "planner";
    case "compact":
      return "management";
    case "grid":
      return "compact";
    default:
      return undefined;
  }
}

export function vsTypographyDensityForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): Extract<SceActivityPresentationDensity, "STANDARD" | "COMPACT"> {
  return density === "standard" ? "STANDARD" : "COMPACT";
}
