"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import type { TournamentSpielplanParticipantOption } from "@/lib/tournaments/spielplan/types";
import SceTournamentFixturePresentation from "./SceTournamentFixturePresentation";
import type { SceTournamentFixtureVisualDensity } from "./SceTournamentFixtureIdentity";
import { buildSpielplanFixtureSidePresentation } from "./spielplan-fixture-side-presentation";

export type SceTournamentFixtureCardDensity = SceTournamentFixtureVisualDensity;

type Props = {
  fixture: TournamentSpielplanFixturePresentation;
  participants: readonly TournamentSpielplanParticipantOption[];
  density?: SceTournamentFixtureCardDensity;
  highlightParticipantId?: string | null;
  /** When false, time is omitted (round header carries shared kickoff). Default true. */
  showFixtureTime?: boolean;
  className?: string;
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
  showFixtureTime = true,
  timezone = "Europe/Zurich",
  className,
  asChildProps,
}: Props) {
  const timeLabel = showFixtureTime ? formatTime(fixture.startUtc, timezone) : null;
  const highlighted =
    highlightParticipantId != null &&
    (fixture.sideAParticipantId === highlightParticipantId ||
      fixture.sideBParticipantId === highlightParticipantId);
  const deEmphasized = highlightParticipantId != null && !highlighted;

  return (
    <SceTournamentFixturePresentation
      density={density === "compact" ? "compact" : "standard"}
      sideA={buildSpielplanFixtureSidePresentation({ fixture, side: "A", participants })}
      sideB={buildSpielplanFixtureSidePresentation({ fixture, side: "B", participants })}
      pitchLabel={fixture.pitchLabel}
      timeLabel={timeLabel}
      result={fixture.result}
      highlighted={highlighted}
      deEmphasized={deEmphasized}
      accessibleLabel={fixtureAccessibleLabel(fixture, timezone)}
      testId={`sce-tournament-fixture-card-${fixture.fixtureId}`}
      className={className}
      asChildProps={asChildProps}
    />
  );
}
