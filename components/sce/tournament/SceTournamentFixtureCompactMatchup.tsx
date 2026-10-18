"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { participantIdentityFromPlanung } from "./planung-participant-identity";
import {
  SceTournamentFixtureParticipant,
  SceTournamentFixtureVs,
} from "./SceTournamentFixtureIdentity";

export type SceTournamentFixtureCompactLayout = "inline" | "stack" | "board";

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
  layout = "stack",
  className,
}: Props) {
  if (layout === "inline" || layout === "board") {
    const crestVariant = layout === "board" ? "planungBoard" : "planung";
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-x-1 gap-y-0.5",
          layout === "board" ? "flex-nowrap" : "flex-wrap",
          className,
        )}
        data-testid="sce-tournament-fixture-compact-matchup"
        data-layout={layout}
        data-crest-variant={crestVariant}
      >
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideA)}
          label={sideA.label}
          density="compact"
          crestVariant={crestVariant}
          align="start"
          qualificationProvenanceLabel={sideA.qualificationProvenanceLabel}
          className="min-w-0 flex-1 basis-0"
        />
        <SceTournamentFixtureVs size="compact" className="mx-0.5 shrink-0" />
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideB)}
          label={sideB.label}
          density="compact"
          crestVariant={crestVariant}
          align="end"
          qualificationProvenanceLabel={sideB.qualificationProvenanceLabel}
          className="min-w-0 flex-1 basis-0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("min-w-0 space-y-1", className)}
      data-testid="sce-tournament-fixture-compact-matchup"
      data-layout="stack"
      data-crest-variant="planungBoard"
    >
      <SceTournamentFixtureParticipant
        identity={participantIdentityFromPlanung(sideA)}
        label={sideA.label}
        density="compact"
        crestVariant="planungBoard"
        align="start"
        qualificationProvenanceLabel={sideA.qualificationProvenanceLabel}
      />
      <div className="flex justify-center py-0.5">
        <SceTournamentFixtureVs size="compact" />
      </div>
      <SceTournamentFixtureParticipant
        identity={participantIdentityFromPlanung(sideB)}
        label={sideB.label}
        density="compact"
        crestVariant="planungBoard"
        align="end"
        qualificationProvenanceLabel={sideB.qualificationProvenanceLabel}
        muted
      />
    </div>
  );
}
