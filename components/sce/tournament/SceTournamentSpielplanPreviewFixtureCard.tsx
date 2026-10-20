"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import SceTournamentFixturePresentation from "./SceTournamentFixturePresentation";

export function formatTournamentSpielplanPlayingFormatLabel(
  playersPerSide: number | null | undefined,
): string | null {
  if (playersPerSide == null || playersPerSide <= 0) return null;
  return `${playersPerSide}v${playersPerSide}`;
}

type Props = {
  fixtureKey: string;
  pitchLabel: string;
  playersPerSide: number | null | undefined;
  sideA: TournamentPlanungFixtureSidePresentation;
  sideB: TournamentPlanungFixtureSidePresentation;
  className?: string;
};

/**
 * Composer Spielplan preview fixture — STANDARD density of the canonical presentation family.
 */
export default function SceTournamentSpielplanPreviewFixtureCard({
  fixtureKey,
  pitchLabel,
  playersPerSide,
  sideA,
  sideB,
  className,
}: Props) {
  const fieldHeadingId = `spielplan-fixture-field-${fixtureKey}`;

  return (
    <SceTournamentFixturePresentation
      density="standard"
      sideA={sideA}
      sideB={sideB}
      pitchLabel={pitchLabel}
      playersPerSide={playersPerSide}
      metadataHeadingId={fieldHeadingId}
      testId={`tournament-composer-schedule-fixture-${fixtureKey}`}
      className={cn(className)}
    />
  );
}
