"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import {
  SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS,
  SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS,
  SCE_TOURNAMENT_FIXTURE_STANDARD_SHELL_CLASS,
} from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { SCE_TOURNAMENT_FOCUS_RING_CLASS } from "@/lib/sce/tournament/sce-tournament-interactive-a11y";
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
      return "flex flex-col gap-3 p-3.5 sm:p-4";
    case "compact":
      return "flex flex-col gap-2.5 px-3 py-3 sm:px-3.5";
    case "grid":
      return "px-2 py-2 sm:px-2.5 sm:py-2.5";
    default:
      return "p-3";
  }
}

function shellClassForDensity(
  density: SceTournamentFixturePresentationDensity,
  embedded: boolean,
): string | null {
  if (embedded) return null;
  switch (density) {
    case "standard":
      return SCE_TOURNAMENT_FIXTURE_STANDARD_SHELL_CLASS;
    case "compact":
      return SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS;
    case "grid":
      return SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS;
    default:
      return SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS;
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
  /** When true, apply subtle hover affordance on the fixture shell. */
  interactive?: boolean;
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
  interactive = false,
}: Props) {
  const formatLabel = formatTournamentSpielplanPlayingFormatLabel(playersPerSide);
  const showMetadata = density !== "grid" && (pitchLabel || timeLabel || formatLabel || result);
  const shellBase = shellClassForDensity(density, embedded);

  const rootClassName = cn(
    shellBase,
    !embedded && shellPaddingForDensity(density),
    embedded && density === "grid" && "min-w-0",
    interactive &&
      !embedded &&
      cn(
        SCE_TOURNAMENT_FOCUS_RING_CLASS,
        "cursor-default hover:border-[var(--sce-surface-border-elevated)]",
      ),
    deEmphasized && "opacity-[0.38]",
    highlighted &&
      !embedded &&
      "border-[var(--sce-primary)]/80 bg-[var(--sce-surface-elevated)]/35 shadow-[0_0_0_1px_var(--sce-primary)/0.12]",
    className,
    shellClassName,
    asChildProps?.className,
  );

  const metadataNode =
    showMetadata && (pitchLabel || timeLabel || formatLabel || result) ? (
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1 space-y-0.5">
          {pitchLabel ? (
            <p
              id={metadataHeadingId}
              className="min-w-0 text-xs font-medium leading-snug text-[var(--text-2)]"
              data-testid="sce-tournament-spielplan-fixture-field"
            >
              {pitchLabel}
            </p>
          ) : null}
          {timeLabel ? (
            <p
              className="text-xs tabular-nums text-[var(--muted)]"
              data-testid="sce-tournament-fixture-time"
            >
              {timeLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {formatLabel ? (
            <p
              className={cn(
                "rounded-[var(--radius-pill)] border border-[var(--sce-surface-border-subtle)]",
                "bg-[var(--sce-surface-elevated)]/50 px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums text-[var(--text-2)]",
              )}
              data-testid="sce-tournament-spielplan-fixture-format"
            >
              {formatLabel}
            </p>
          ) : null}
          {result ? (
            <p
              className="text-sm font-semibold tabular-nums text-[var(--foreground)]"
              aria-label={`Ergebnis ${result.scoreSideA} zu ${result.scoreSideB}`}
              data-testid="sce-tournament-fixture-result"
            >
              {result.scoreSideA}:{result.scoreSideB}
            </p>
          ) : null}
        </div>
      </header>
    ) : null;

  const identityNode = (
    <div
      className="flex min-w-0 flex-1 justify-center"
      data-testid="sce-tournament-fixture-matchup"
    >
      <div className="min-w-0 w-full max-w-full" data-testid="sce-tournament-fixture-matchup-cluster">
        <SceTournamentFixtureCompactMatchup
          layout={matchupLayoutForDensity(density)}
          presentationDensity={density}
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
