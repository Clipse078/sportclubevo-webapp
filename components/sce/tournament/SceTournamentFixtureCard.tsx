"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import type { TournamentSpielplanParticipantOption } from "@/lib/tournaments/spielplan/types";
import { cn } from "@/lib/cn";
import { participantIdentityFromSpielplan } from "./spielplan-participant-identity";
import {
  SceTournamentFixtureParticipant,
  SceTournamentFixtureVs,
  type SceTournamentFixtureVisualDensity,
} from "./SceTournamentFixtureIdentity";

export type SceTournamentFixtureCardDensity = SceTournamentFixtureVisualDensity;

type Props = {
  fixture: TournamentSpielplanFixturePresentation;
  participants: readonly TournamentSpielplanParticipantOption[];
  density?: SceTournamentFixtureCardDensity;
  highlightParticipantId?: string | null;
  className?: string;
  /** When set, fixture card is embedded in a draggable control (Planung). */
  timezone?: string;
  asChildProps?: ComponentPropsWithoutRef<"div">;
};

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function fixtureAccessibleLabel(
  fixture: TournamentSpielplanFixturePresentation,
  timezone: string,
): string {
  const time = formatTime(fixture.startUtc, timezone);
  const score =
    fixture.result != null
      ? `, Ergebnis ${fixture.result.scoreSideA} zu ${fixture.result.scoreSideB}`
      : "";
  return `${time}, ${fixture.pitchLabel}, ${fixture.sideALabel} gegen ${fixture.sideBLabel}${score}`;
}

export default function SceTournamentFixtureCard({
  fixture,
  participants,
  density = "standard",
  highlightParticipantId = null,
  timezone = "Europe/Zurich",
  className,
  asChildProps,
}: Props) {
  const timeLabel = formatTime(fixture.startUtc, timezone);
  const highlighted =
    highlightParticipantId != null &&
    (fixture.sideAParticipantId === highlightParticipantId ||
      fixture.sideBParticipantId === highlightParticipantId);

  const rootClassName = cn(
    "rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/90 shadow-sm transition-[opacity,box-shadow,transform]",
    density === "standard" ? "px-3 py-3.5 sm:px-4 sm:py-4" : "p-2",
    highlightParticipantId && !highlighted ? "opacity-45" : "",
    highlighted ? "ring-2 ring-[var(--sce-focus)] shadow-md" : "",
    className,
    asChildProps?.className,
  );

  const sideAIdentity = participantIdentityFromSpielplan(
    participants,
    fixture.sideAParticipantId,
    fixture.sideALabel,
    fixture.sideAIsPlaceholder,
  );
  const sideBIdentity = participantIdentityFromSpielplan(
    participants,
    fixture.sideBParticipantId,
    fixture.sideBLabel,
    fixture.sideBIsPlaceholder,
  );

  const matchup = (
    <div
      className={cn(
        "grid min-w-0 flex-1 items-center gap-2",
        density === "standard"
          ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:gap-3"
          : "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5",
      )}
    >
      <SceTournamentFixtureParticipant
        identity={sideAIdentity}
        label={fixture.sideALabel}
        density={density}
        align="start"
      />
      <SceTournamentFixtureVs highlighted={highlighted} size={density} />
      <SceTournamentFixtureParticipant
        identity={sideBIdentity}
        label={fixture.sideBLabel}
        density={density}
        align="end"
      />
    </div>
  );

  const content =
    density === "standard" ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="shrink-0 tabular-nums sm:w-[5.25rem]">
          <p className="text-sm font-semibold text-[var(--foreground)]">{timeLabel}</p>
          <p className="text-xs text-[var(--muted)]">{fixture.pitchLabel}</p>
        </div>
        {matchup}
        {fixture.result ? (
          <p
            className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)] sm:pl-1"
            aria-label={`Ergebnis ${fixture.result.scoreSideA} zu ${fixture.result.scoreSideB}`}
          >
            {fixture.result.scoreSideA}:{fixture.result.scoreSideB}
          </p>
        ) : null}
      </div>
    ) : (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <div className="shrink-0 tabular-nums w-12">
          <p className="text-sm font-semibold text-[var(--foreground)]">{timeLabel}</p>
          <p className="text-xs text-[var(--muted)]">{fixture.pitchLabel}</p>
        </div>
        <div className="min-w-0">
          {matchup}
          {fixture.result ? (
            <p
              className="mt-1 text-xs font-semibold tabular-nums text-[var(--foreground)]"
              aria-label={`Ergebnis ${fixture.result.scoreSideA} zu ${fixture.result.scoreSideB}`}
            >
              {fixture.result.scoreSideA}:{fixture.result.scoreSideB}
            </p>
          ) : null}
        </div>
      </div>
    );

  if (asChildProps) {
    const { className: _ignored, ...rest } = asChildProps;
    return (
      <div
        {...rest}
        className={rootClassName}
        data-testid={`sce-tournament-fixture-card-${fixture.fixtureId}`}
        aria-label={fixtureAccessibleLabel(fixture, timezone)}
      >
        {content}
      </div>
    );
  }

  return (
    <article
      className={rootClassName}
      data-testid={`sce-tournament-fixture-card-${fixture.fixtureId}`}
      aria-label={fixtureAccessibleLabel(fixture, timezone)}
    >
      {content}
    </article>
  );
}
