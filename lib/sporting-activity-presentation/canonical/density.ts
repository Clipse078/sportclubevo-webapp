import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";
import type { SceActivityPresentationDensity } from "./types";

/**
 * Which semantic dimensions each density may surface.
 * Identity grammar (e.g. match home|crest|VS|crest|away) never changes by density.
 */
export type SceActivityDensityDimensionPolicy = "required" | "preferred" | "optional" | "hidden";

export type SceActivityDensityContract = {
  identity: SceActivityDensityDimensionPolicy;
  schedule: SceActivityDensityDimensionPolicy;
  status: SceActivityDensityDimensionPolicy;
  location: SceActivityDensityDimensionPolicy;
  teamOrOrganiserContext: SceActivityDensityDimensionPolicy;
  competitionOrResult: SceActivityDensityDimensionPolicy;
  crests: SceActivityDensityDimensionPolicy;
};

export const SCE_ACTIVITY_DENSITY_CONTRACT: Record<
  SceActivityPresentationDensity,
  SceActivityDensityContract
> = {
  HERO: {
    identity: "required",
    schedule: "required",
    status: "preferred",
    location: "preferred",
    teamOrOrganiserContext: "optional",
    competitionOrResult: "optional",
    crests: "required",
  },
  STANDARD: {
    identity: "required",
    schedule: "required",
    status: "preferred",
    location: "optional",
    teamOrOrganiserContext: "optional",
    competitionOrResult: "optional",
    crests: "preferred",
  },
  COMPACT: {
    identity: "required",
    schedule: "required",
    status: "preferred",
    location: "optional",
    teamOrOrganiserContext: "hidden",
    competitionOrResult: "optional",
    crests: "optional",
  },
  MICRO: {
    identity: "required",
    schedule: "required",
    status: "optional",
    location: "hidden",
    teamOrOrganiserContext: "hidden",
    competitionOrResult: "hidden",
    crests: "optional",
  },
};

/** Maps existing design-system layout density to canonical 01C density names. */
export function mapSportingActivityDensityToSceDensity(
  density: SportingActivityDensity | "hero" | "micro",
): SceActivityPresentationDensity {
  switch (density) {
    case "hero":
      return "HERO";
    case "micro":
      return "MICRO";
    case "compact":
      return "COMPACT";
    case "planner":
    case "management":
      return "STANDARD";
  }
}
