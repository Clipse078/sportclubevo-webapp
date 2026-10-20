"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import {
  SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS,
  SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS,
} from "@/lib/sce/tournament/sce-tournament-surface-layout";
import SceTournamentFixtureCompactMatchup, {
  type SceTournamentFixtureCompactLayout,
} from "./SceTournamentFixtureCompactMatchup";
import { formatTournamentSpielplanPlayingFormatLabel } from "./SceTournamentSpielplanPreviewFixtureCard";

export type SceTournamentFixturePresentationDensity = "standard" | "compact" | "grid";

function matchupLayoutForDensity(
  density: SceTournamentFixturePresentationDensity,
): SceTournamentFixtureCompactLayout {
  return density === "grid" ? "board" : "spielplan";
}

function shellPaddingForDensity(density: SceTournamentFixturePresentationDensity): string {
  switch (density) {
    case "standard":
      return "flex flex-col gap-2.5 p-3.5 sm:p-4";
    case "compact":
      return "flex flex-col gap-2 px-3 py-3";
    case "grid":
      return "px-1.5 py-1.5";
    default:
      return "p-3";
  }
}

type Props = {
  density: SceTournamentFixturePresentationDensity;
  sideA: TournamentPlanungFixtureSidePresentation;
  sideB: TournamentPlanungFixtureSidePresentation;
  pitchLabel?: string | null;
  timeLabel?: string | null;
  playersPerSide?: number | null;
  result?: { scoreSideA: number; scoreSideB: number } | null;
  highlighted?: boolean;
  deEmphasized?: boolean;
  accessibleLabel?: string;
  testId?: string;
  metadataHeadingId?: string;
  className?: string;
  shellClassName?: string;
  asChildProps?: ComponentPropsWithoutRef<"div">;
  footer?: ReactNode;
  /** When true, render identity/metadata only (interactive shell lives in parent, e.g. DnD grid). */
  embedded?: boolean;
};

/**
 * Canonical tournament fixture presentation — one SCE match-identity family at multiple densities.
 */
export default function SceTournamentFixturePresentation({
  density,
  sideA,
  sideB,
  pitchLabel = null,
  timeLabel = null,
  playersPerSide = null,
  result = null,
  highlighted = false,
  deEmphasized = false,
  accessibleLabel,
  testId,
  metadataHeadingId,
  className,
  shellClassName,
  asChildProps,
  footer,
  embedded = false,
}: Props) {
  const formatLabel = formatTournamentSpielplanPlayingFormatLabel(playersPerSide);
  const showMetadata = density !== "grid" && (pitchLabel || timeLabel || formatLabel);
  const shellBase =
    density === "standard"
      ? SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS
      : density === "compact"
        ? SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS
        : SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS;

  const rootClassName = cn(
    !embedded && shellBase,
    !embedded && shellPaddingForDensity(density),
    embedded && density === "grid" && "min-w-0",
    deEmphasized && "opacity-[0.38]",
    highlighted && !embedded && "border-[var(--sce-primary)] bg-[var(--sce-surface-elevated)]",
    className,
    shellClassName,
    asChildProps?.className,
  );

  const metadataNode =
    showMetadata && (pitchLabel || timeLabel || formatLabel) ? (
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {timeLabel ? (
            <p className="text-xs tabular-nums text-[var(--muted)]" data-testid="sce-tournament-fixture-time">
              {timeLabel}
            </p>
          ) : null}
          {pitchLabel ? (
            <p
              id={metadataHeadingId}
              className={cn(
                "min-w-0 font-semibold leading-snug text-[var(--foreground)]",
                density === "standard" ? "text-xs" : "text-xs",
              )}
              data-testid="sce-tournament-spielplan-fixture-field"
            >
              {pitchLabel}
            </p>
          ) : null}
        </div>
        {formatLabel ? (
          <p
            className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-2)]"
            data-testid="sce-tournament-spielplan-fixture-format"
          >
            {formatLabel}
          </p>
        ) : null}
        {result ? (
          <p
            className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]"
            aria-label={`Ergebnis ${result.scoreSideA} zu ${result.scoreSideB}`}
            data-testid="sce-tournament-fixture-result"
          >
            {result.scoreSideA}:{result.scoreSideB}
          </p>
        ) : null}
      </header>
    ) : null;

  const identityNode = (
    <div
      className="flex min-w-0 flex-1 justify-center"
      data-testid="sce-tournament-fixture-matchup"
    >
      <div className="min-w-0 max-w-full" data-testid="sce-tournament-fixture-matchup-cluster">
        <SceTournamentFixtureCompactMatchup
          layout={matchupLayoutForDensity(density)}
          sideA={sideA}
          sideB={sideB}
        />
      </div>
    </div>
  );

  const content = (
    <>
      {metadataNode}
      {identityNode}
      {result && density === "grid" ? (
        <p
          className="mt-0.5 text-center text-[10px] font-semibold tabular-nums text-[var(--foreground)]"
          aria-label={`Ergebnis ${result.scoreSideA} zu ${result.scoreSideB}`}
        >
          {result.scoreSideA}:{result.scoreSideB}
        </p>
      ) : null}
      {footer}
    </>
  );

  if (asChildProps) {
    const { className: _ignored, ...rest } = asChildProps;
    return (
      <div
        {...rest}
        className={rootClassName}
        data-testid={testId}
        data-sce-tournament-fixture-density={density}
        aria-label={accessibleLabel}
      >
        {content}
      </div>
    );
  }

  return (
    <article
      className={rootClassName}
      data-testid={testId}
      data-sce-tournament-fixture-density={density}
      aria-label={accessibleLabel}
      aria-labelledby={metadataHeadingId && pitchLabel ? metadataHeadingId : undefined}
    >
      {content}
    </article>
  );
}
