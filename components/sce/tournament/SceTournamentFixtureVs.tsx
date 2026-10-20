"use client";

import { cn } from "@/lib/cn";
import { sceMatchCenterTypographyScale } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import { vsTypographyDensityForFixturePresentation } from "@/lib/sce/tournament/sce-tournament-fixture-presentation-density";
import type { SceTournamentFixturePresentationDensity } from "./SceTournamentFixturePresentation";

type Props = {
  density: SceTournamentFixturePresentationDensity;
};

const CAPSULE_PADDING: Record<SceTournamentFixturePresentationDensity, string> = {
  standard: "min-w-[2.375rem] px-2.5 py-[0.3125rem]",
  compact: "min-w-[2rem] px-2 py-0.5",
  grid: "min-w-[1.75rem] px-1.5 py-0.5",
};

/**
 * Canonical tournament fixture VS — subtle capsule separator, density-scaled.
 */
export default function SceTournamentFixtureVs({ density }: Props) {
  const typographyDensity = vsTypographyDensityForFixturePresentation(density);
  const vsScale = sceMatchCenterTypographyScale(typographyDensity);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        "border-[var(--sce-surface-border-subtle)]",
        density === "grid"
          ? "bg-[var(--sce-surface-elevated)]/85"
          : "bg-[var(--sce-surface-elevated)]/75",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        "ring-1 ring-inset ring-[var(--sce-primary)]/[0.07]",
        CAPSULE_PADDING[density],
        vsScale.vsTextClass,
        "font-semibold",
      )}
      aria-hidden
      data-testid="sce-match-vs"
      data-sce-match-region="separator"
      data-sce-tournament-fixture-vs-density={density}
    >
      VS
    </span>
  );
}
