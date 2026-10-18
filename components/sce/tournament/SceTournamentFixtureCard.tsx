"use client";

import type { ComponentPropsWithoutRef } from "react";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import type { TournamentSpielplanParticipantOption } from "@/lib/tournaments/spielplan/types";
import { cn } from "@/lib/cn";
import { participantIdentityFromSpielplan } from "./spielplan-participant-identity";

export type SceTournamentFixtureCardDensity = "standard" | "compact";

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

function ParticipantSide({
  participantId,
  label,
  isPlaceholder,
  participants,
  density,
  align,
}: {
  participantId: string | null;
  label: string;
  isPlaceholder: boolean;
  participants: readonly TournamentSpielplanParticipantOption[];
  density: SceTournamentFixtureCardDensity;
  align: "start" | "end";
}) {
  const identity = participantIdentityFromSpielplan(
    participants,
    participantId,
    label,
    isPlaceholder,
  );
  const crestDensity = density === "compact" ? "micro" : "compact";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "end" ? "flex-row-reverse text-right" : "flex-row text-left",
      )}
    >
      <ClubCrest identity={identity} density={crestDensity} decorative className="shrink-0" />
      <span className="truncate text-sm font-medium text-[var(--foreground)]">{label}</span>
    </div>
  );
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
    "rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/80 shadow-sm transition-[opacity,box-shadow,transform]",
    density === "standard" ? "p-3 sm:p-4" : "p-2",
    highlightParticipantId && !highlighted ? "opacity-45" : "",
    highlighted ? "ring-2 ring-[var(--sce-focus)] shadow-md" : "",
    className,
    asChildProps?.className,
  );

  const content = (
    <>
      <div
        className={cn(
          "flex gap-3",
          density === "standard"
            ? "flex-col sm:flex-row sm:items-center"
            : "flex-row items-center gap-2",
        )}
      >
        <div
          className={cn(
            "shrink-0 tabular-nums",
            density === "standard" ? "sm:w-16" : "w-12",
          )}
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">{timeLabel}</p>
          <p className="text-xs text-[var(--muted)]">{fixture.pitchLabel}</p>
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2",
            density === "compact" ? "gap-1.5" : "gap-3 sm:gap-4",
          )}
        >
          <ParticipantSide
            participantId={fixture.sideAParticipantId}
            label={fixture.sideALabel}
            isPlaceholder={fixture.sideAIsPlaceholder}
            participants={participants}
            density={density}
            align="start"
          />
          <span
            className={cn(
              "shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]",
              highlighted && "border-[var(--sce-focus)] text-[var(--foreground)]",
            )}
            aria-hidden
          >
            VS
          </span>
          <ParticipantSide
            participantId={fixture.sideBParticipantId}
            label={fixture.sideBLabel}
            isPlaceholder={fixture.sideBIsPlaceholder}
            participants={participants}
            density={density}
            align="end"
          />
        </div>

        {fixture.result ? (
          <p
            className={cn(
              "shrink-0 tabular-nums font-semibold text-[var(--foreground)]",
              density === "compact" ? "text-xs" : "text-sm",
            )}
            aria-label={`Ergebnis ${fixture.result.scoreSideA} zu ${fixture.result.scoreSideB}`}
          >
            {fixture.result.scoreSideA}:{fixture.result.scoreSideB}
          </p>
        ) : null}
      </div>
    </>
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
