"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { participantIdentityFromPlanung } from "./planung-participant-identity";
import {
  SceTournamentFixtureParticipant,
  SceTournamentFixtureVs,
} from "./SceTournamentFixtureIdentity";
import {
  buildStackedFixtureAccessibleLabel,
  SceMatchStackedFixtureIdentity,
} from "@/components/sporting-activity/SceMatchStackedFixtureIdentity";
import { SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";

export type SceTournamentFixtureCompactLayout = "inline" | "stack" | "board";

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
  layout = "stack",
  className,
}: Props) {
  if (layout === "inline") {
    const crestVariant = "planung";
    return (
      <div
        className={cn("flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5", className)}
        data-testid="sce-tournament-fixture-compact-matchup"
        data-layout="inline"
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

  if (layout === "board") {
    const homeLabel = formatSideLabel(sideA);
    const awayLabel = formatSideLabel(sideB);
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
              className={cn(
                "shrink-0 text-[0.625rem] font-medium uppercase tracking-[0.08em]",
                SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
              )}
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
