"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { participantIdentityFromPlanung } from "./planung-participant-identity";
import {
  SceTournamentFixtureParticipant,
  SceTournamentFixtureVs,
} from "./SceTournamentFixtureIdentity";

export type SceTournamentFixtureCompactLayout = "inline" | "stack";

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
  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
          className,
        )}
        data-testid="sce-tournament-fixture-compact-matchup"
        data-layout="inline"
      >
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideA)}
          label={sideA.label}
          density="compact"
          align="start"
          qualificationProvenanceLabel={sideA.qualificationProvenanceLabel}
          className="min-w-0 flex-1 basis-0"
        />
        <SceTournamentFixtureVs size="compact" className="mx-0.5 shrink-0" />
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideB)}
          label={sideB.label}
          density="compact"
          align="start"
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
    >
      <SceTournamentFixtureParticipant
        identity={participantIdentityFromPlanung(sideA)}
        label={sideA.label}
        density="compact"
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
        align="start"
        qualificationProvenanceLabel={sideB.qualificationProvenanceLabel}
        muted
      />
    </div>
  );
}
