"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { participantIdentityFromPlanung } from "./planung-participant-identity";
import {
  buildStackedFixtureAccessibleLabel,
  SceMatchStackedFixtureIdentity,
} from "@/components/sporting-activity/SceMatchStackedFixtureIdentity";
import { sceMatchCenterTypographyScale } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import { cn } from "@/lib/cn";

export type SceTournamentFixtureCompactLayout = "inline" | "stack" | "board" | "spielplan";

function formatSideLabel(side: TournamentPlanungFixtureSidePresentation): string {
  if (!side.qualificationProvenanceLabel) {
    return side.label;
  }
  return `${side.label} (${side.qualificationProvenanceLabel})`;
}

type Props = {
  sideA: TournamentPlanungFixtureSidePresentation;
  sideB: TournamentPlanungFixtureSidePresentation;
  layout?: SceTournamentFixtureCompactLayout;
  className?: string;
};

/**
 * COMPACT Planung fixture identity — crest, names, VS.
 * Inline for round lists; stack for narrow board cells (DnD-safe).
 */
export default function SceTournamentFixtureCompactMatchup({
  sideA,
  sideB,
  layout = "spielplan",
  className,
}: Props) {
  if (layout === "inline" || layout === "stack" || layout === "spielplan") {
    const resolvedLayout = layout === "inline" || layout === "stack" ? "spielplan" : layout;
    const homeLabel = formatSideLabel(sideA);
    const awayLabel = formatSideLabel(sideB);
    const vsScale = sceMatchCenterTypographyScale("COMPACT");
    return (
      <div
        className={cn("min-w-0", className)}
        data-testid="sce-tournament-fixture-compact-matchup"
        data-layout={layout === "inline" || layout === "stack" ? layout : "spielplan"}
        data-crest-variant="canonicalSpielplan"
      >
        <SceMatchStackedFixtureIdentity
          home={{
            identity: participantIdentityFromPlanung(sideA),
            displayName: homeLabel,
          }}
          away={{
            identity: participantIdentityFromPlanung(sideB),
            displayName: awayLabel,
          }}
          density="COMPACT"
          ariaLabel={buildStackedFixtureAccessibleLabel(homeLabel, awayLabel)}
          className={resolvedLayout === "spielplan" ? "py-0.5" : "py-0.5"}
          center={
            <span
              className={cn("shrink-0 uppercase text-[var(--muted)]", vsScale.vsTextClass)}
              aria-hidden
              data-testid="sce-match-vs"
              data-sce-match-region="separator"
            >
              VS
            </span>
          }
        />
      </div>
    );
  }

  if (layout === "board") {
    const homeLabel = formatSideLabel(sideA);
    const awayLabel = formatSideLabel(sideB);
    const vsScale = sceMatchCenterTypographyScale("COMPACT");
    return (
      <div
        className={cn("min-w-0", className)}
        data-testid="sce-tournament-fixture-compact-matchup"
        data-layout="board"
        data-crest-variant="canonicalStacked"
      >
        <SceMatchStackedFixtureIdentity
          home={{
            identity: participantIdentityFromPlanung(sideA),
            displayName: homeLabel,
          }}
          away={{
            identity: participantIdentityFromPlanung(sideB),
            displayName: awayLabel,
          }}
          density="COMPACT"
          crestVisualSizeOverride="compact"
          ariaLabel={buildStackedFixtureAccessibleLabel(homeLabel, awayLabel)}
          className="py-0"
          center={
            <span
              className={cn("shrink-0 uppercase text-[var(--muted)]", vsScale.vsTextClass)}
              aria-hidden
              data-testid="sce-match-vs"
              data-sce-match-region="separator"
            >
              VS
            </span>
          }
        />
      </div>
    );
  }

  return null;
}
