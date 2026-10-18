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
        data-crest-variant="planung"
      >
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideA)}
          label={sideA.label}
          density="compact"
          crestVariant="planung"
          align="start"
          qualificationProvenanceLabel={sideA.qualificationProvenanceLabel}
          className="min-w-0 flex-1 basis-0"
        />
        <SceTournamentFixtureVs size="compact" className="mx-1 shrink-0" />
        <SceTournamentFixtureParticipant
          identity={participantIdentityFromPlanung(sideB)}
          label={sideB.label}
          density="compact"
          crestVariant="planung"
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
