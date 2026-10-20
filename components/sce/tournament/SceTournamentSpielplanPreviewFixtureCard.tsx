"use client";

import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import SceTournamentFixtureCompactMatchup from "./SceTournamentFixtureCompactMatchup";

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
 * Composer Spielplan preview fixture — field metadata + canonical stacked match identity.
 * Round/time live on the surrounding round container, not inside the card.
 */
export default function SceTournamentSpielplanPreviewFixtureCard({
  fixtureKey,
  pitchLabel,
  playersPerSide,
  sideA,
  sideB,
  className,
}: Props) {
  const formatLabel = formatTournamentSpielplanPlayingFormatLabel(playersPerSide);
  const fieldHeadingId = `spielplan-fixture-field-${fixtureKey}`;

  return (
    <article
      className={cn(
        SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS,
        "flex flex-col gap-2.5 p-3.5 sm:p-4",
        className,
      )}
      data-testid={`tournament-composer-schedule-fixture-${fixtureKey}`}
      aria-labelledby={fieldHeadingId}
    >
      <header className="flex items-start justify-between gap-3">
        <p
          id={fieldHeadingId}
          className="min-w-0 text-xs font-semibold leading-snug text-[var(--foreground)]"
          data-testid="sce-tournament-spielplan-fixture-field"
        >
          {pitchLabel}
        </p>
        {formatLabel ? (
          <p
            className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-2)]"
            data-testid="sce-tournament-spielplan-fixture-format"
          >
            {formatLabel}
          </p>
        ) : null}
      </header>
      <SceTournamentFixtureCompactMatchup layout="spielplan" sideA={sideA} sideB={sideB} />
    </article>
  );
}
