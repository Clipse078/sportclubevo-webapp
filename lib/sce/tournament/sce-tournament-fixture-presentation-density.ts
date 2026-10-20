import type { ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";
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
      /** Between legacy grid compact (32px) and Master management (40px). */
      return "board";
    default:
      return undefined;
  }
}

export function vsTypographyDensityForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): Extract<SceActivityPresentationDensity, "STANDARD" | "COMPACT" | "MICRO"> {
  return density === "standard" ? "STANDARD" : density === "grid" ? "MICRO" : "COMPACT";
}

export type SceTournamentFixtureStackedLayoutScale = {
  identityStackGapClass: string;
  fixtureGridGapXClass: string;
  fixtureGapYClass: string;
  fixtureOuterPyClass: string;
};

const GRID_STACKED_LAYOUT_SCALE: SceTournamentFixtureStackedLayoutScale = {
  identityStackGapClass: "gap-1",
  fixtureGridGapXClass: "gap-x-2 sm:gap-x-2.5",
  fixtureGapYClass: "gap-y-0",
  fixtureOuterPyClass: "py-0.5",
};

/** Grid-only stacked identity rhythm — crest-forward, readable names without dominating. */
export function stackedLayoutScaleForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): SceTournamentFixtureStackedLayoutScale | null {
  return density === "grid" ? GRID_STACKED_LAYOUT_SCALE : null;
}

export function clubNameClassForFixturePresentation(
  density: SceTournamentFixturePresentationDensity,
): string | null {
  if (density !== "grid") return null;
  return cn(
    "line-clamp-2 text-[0.6875rem] font-semibold leading-[1.25]",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  );
}

/** Embedded grid shell padding inside DnD control (matrix cell). */
export function gridEmbeddedShellPaddingClass(): string {
  return "px-2 py-2 sm:px-2.5 sm:py-2.5";
}
