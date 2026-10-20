"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { participantIdentityFromPlanung } from "./planung-participant-identity";
import {
  buildStackedFixtureAccessibleLabel,
  SceMatchStackedFixtureIdentity,
} from "@/components/sporting-activity/SceMatchStackedFixtureIdentity";
import { sceMatchRichDensityScale } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import {
  crestVisualSizeOverrideForFixturePresentation,
  matchIdentityDensityForFixturePresentation,
} from "@/lib/sce/tournament/sce-tournament-fixture-presentation-density";
import { cn } from "@/lib/cn";
import SceTournamentFixtureVs from "./SceTournamentFixtureVs";
import type { SceTournamentFixturePresentationDensity } from "./SceTournamentFixturePresentation";

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
  presentationDensity?: SceTournamentFixturePresentationDensity;
  className?: string;
};

/**
 * Tournament fixture identity — crest above name, canonical VS, symmetric participant zones.
 */
export default function SceTournamentFixtureCompactMatchup({
  sideA,
  sideB,
  layout = "spielplan",
  presentationDensity = "compact",
  className,
}: Props) {
  const resolvedLayout =
    layout === "inline" || layout === "stack" ? "spielplan" : layout === "board" ? "board" : layout;
  const homeLabel = formatSideLabel(sideA);
  const awayLabel = formatSideLabel(sideB);
  const matchDensity = matchIdentityDensityForFixturePresentation(presentationDensity);
  const scale = sceMatchRichDensityScale(matchDensity);
  const crestOverride = crestVisualSizeOverrideForFixturePresentation(presentationDensity);

  return (
    <div
      className={cn("min-w-0", className)}
      data-testid="sce-tournament-fixture-compact-matchup"
      data-layout={layout === "inline" || layout === "stack" ? layout : resolvedLayout}
      data-crest-variant={resolvedLayout === "board" ? "canonicalStacked" : "canonicalSpielplan"}
      data-presentation-density={presentationDensity}
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
        density={matchDensity}
        crestVisualSizeOverride={crestOverride}
        ariaLabel={buildStackedFixtureAccessibleLabel(homeLabel, awayLabel)}
        className={cn(
          resolvedLayout === "board" ? "py-0" : "py-0.5",
          scale.fixtureGridGapXClass,
          scale.fixtureGapYClass,
        )}
        center={<SceTournamentFixtureVs density={presentationDensity} />}
      />
    </div>
  );
}
