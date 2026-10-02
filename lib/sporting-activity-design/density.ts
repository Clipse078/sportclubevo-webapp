import type { SportingActivityPresentationDensity } from "@/lib/sporting-activity-presentation/types";

/** Visual layout density for sporting activities (01A design system). */
export type SportingActivityDensity = "compact" | "planner" | "management";

/**
 * Maps design-system density to the UX-01 presentation formatter density.
 * Planner and management both use the "standard" secondary layout until 01D introduces planner blocks.
 */
export function mapSportingActivityDensityToPresentationDensity(
  density: SportingActivityDensity,
): SportingActivityPresentationDensity {
  switch (density) {
    case "compact":
      return "compact";
    case "planner":
    case "management":
      return "standard";
  }
}

export function clubCrestSizeForDensity(
  density: SportingActivityDensity,
): "compact" | "planner" | "management" {
  return density;
}
