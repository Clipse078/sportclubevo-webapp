"use client";

import type { ReactNode } from "react";
import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { isSceActivityDimensionVisible } from "@/lib/sporting-activity-presentation/canonical/match-card-policy";
import {
  isSceMatchRichCardDensity,
  sceMatchCrestVisualSizeForDensity,
  sceMatchRichDensityScale,
} from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import type { SceTournamentFixtureStackedLayoutScale } from "@/lib/sce/tournament/sce-tournament-fixture-presentation-density";

export type SceMatchStackedFixtureSide = {
  identity: ClubIdentity;
  /** Tournament-local or contextual label; defaults to identity.displayName. */
  displayName?: string;
};

export type SceMatchStackedFixtureIdentityProps = {
  home: SceMatchStackedFixtureSide;
  away: SceMatchStackedFixtureSide;
  density: SceActivityPresentationDensity;
  center: ReactNode;
  /** Accessible fixture label (e.g. "Team A gegen Team B"). */
  ariaLabel: string;
  className?: string;
  testId?: string;
  showCrests?: boolean;
  /** Narrow schedule cells — keep canonical grammar with slightly smaller crests. */
  crestVisualSizeOverride?: ClubCrestVisualSize;
  /** Tournament grid density — crest-forward name scale without changing rich-card tiers. */
  clubNameClassOverride?: string;
  layoutScaleOverride?: Pick<
    SceTournamentFixtureStackedLayoutScale,
    "identityStackGapClass" | "fixtureGridGapXClass" | "fixtureGapYClass"
  >;
};

function richScale(density: SceActivityPresentationDensity) {
  return isSceMatchRichCardDensity(density)
    ? sceMatchRichDensityScale(density)
    : sceMatchRichDensityScale("COMPACT");
}

function clubNameClassForDensity(density: SceActivityPresentationDensity): string {
  if (density === "MICRO") {
    return "truncate text-[0.8125rem] font-medium";
  }
  return richScale(density).clubNameClass;
}

function crestSizeForDensity(
  density: SceActivityPresentationDensity,
  override?: ClubCrestVisualSize,
): ClubCrestVisualSize {
  return override ?? sceMatchCrestVisualSizeForDensity(density);
}

function SceMatchStackedIdentityColumn({
  side,
  sideModel,
  density,
  showCrests,
  crestVisualSize,
  clubNameClassOverride,
  identityStackGapClass,
}: {
  side: "home" | "away";
  sideModel: SceMatchStackedFixtureSide;
  density: SceActivityPresentationDensity;
  showCrests: boolean;
  crestVisualSize: ClubCrestVisualSize;
  clubNameClassOverride?: string;
  identityStackGapClass: string;
}) {
  const label = sideModel.displayName?.trim() || sideModel.identity.displayName;

  return (
    <div
      data-sce-match-side={side}
      data-sce-match-region={`${side}-identity`}
      className={cn(
        "flex min-w-0 flex-col items-center text-center",
        identityStackGapClass,
      )}
    >
      {showCrests ? (
        <div data-sce-match-region={`${side}-crest`}>
          <ClubCrest identity={sideModel.identity} density={crestVisualSize} decorative />
        </div>
      ) : null}
      <span
        className={cn(
          "min-w-0 text-[var(--foreground)]",
          clubNameClassOverride ?? clubNameClassForDensity(density),
        )}
        title={label}
        data-sce-match-region={`${side}-name`}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Canonical stacked match identity — home crest/name, VS (or result), away crest/name.
 * Shared by full SceMatchCard and compact tournament schedule cells.
 */
export function SceMatchStackedFixtureIdentity({
  home,
  away,
  density,
  center,
  ariaLabel,
  className,
  testId = "sce-match-fixture",
  showCrests = isSceActivityDimensionVisible(density, "crests"),
  crestVisualSizeOverride,
  clubNameClassOverride,
  layoutScaleOverride,
}: SceMatchStackedFixtureIdentityProps) {
  const scale = richScale(density);
  const crestVisualSize = crestSizeForDensity(density, crestVisualSizeOverride);
  const identityStackGapClass =
    layoutScaleOverride?.identityStackGapClass ?? scale.identityStackGapClass;
  const fixtureGridGapXClass =
    layoutScaleOverride?.fixtureGridGapXClass ?? scale.fixtureGridGapXClass;
  const fixtureGapYClass = layoutScaleOverride?.fixtureGapYClass ?? scale.fixtureGapYClass;

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center py-1",
        fixtureGridGapXClass,
        fixtureGapYClass,
        className,
      )}
      data-testid={testId}
      data-sce-match-region="fixture"
      aria-label={ariaLabel}
    >
      <SceMatchStackedIdentityColumn
        side="home"
        sideModel={home}
        density={density}
        showCrests={showCrests}
        crestVisualSize={crestVisualSize}
        clubNameClassOverride={clubNameClassOverride}
        identityStackGapClass={identityStackGapClass}
      />
      <div
        className="flex items-center justify-center px-1"
        data-sce-match-region="center"
        data-sce-match-center
      >
        {center}
      </div>
      <SceMatchStackedIdentityColumn
        side="away"
        sideModel={away}
        density={density}
        showCrests={showCrests}
        crestVisualSize={crestVisualSize}
        clubNameClassOverride={clubNameClassOverride}
        identityStackGapClass={identityStackGapClass}
      />
    </div>
  );
}

export function buildStackedFixtureAccessibleLabel(
  homeLabel: string,
  awayLabel: string,
): string {
  return `${homeLabel} gegen ${awayLabel}`;
}
