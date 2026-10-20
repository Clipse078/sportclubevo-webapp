"use client";

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";
import SceTournamentFixtureCard from "./SceTournamentFixtureCard";
import SceTournamentRoundHeader from "./SceTournamentRoundHeader";
import SceTournamentScheduleBreakPresentation from "./SceTournamentScheduleBreakPresentation";
import { SCE_TOURNAMENT_ROUND_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";

type Props = {
  model: TournamentSpielplanViewModel;
  highlightParticipantId?: string | null;
};

function fixtureCountLabel(count: number): string {
  return count === 1 ? "1 Spiel" : `${count} Spiele`;
}

export default function TournamentSpielplanMasterSchedule({
  model,
  highlightParticipantId = null,
}: Props) {
  const { presentationItems, participants } = model;

  if (presentationItems.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]" data-testid="spielplan-master-empty">
        Noch kein Spielplan verfügbar.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="spielplan-master-schedule">
      {presentationItems.map((item) => {
        if (item.kind === "SCHEDULE_BREAK") {
          const { break: br } = item;
          const isAllPitches = br.scope === "ALL_PITCHES";
          return (
            <SceTournamentScheduleBreakPresentation
              key={`break-${br.breakId}`}
              layout={isAllPitches ? "spielplan-all-pitches" : "spielplan-selected-pitches"}
              label={br.label}
              timeLabel={br.timeLabel}
              scopeLabel={isAllPitches ? null : br.scopeLabel}
              testId={
                isAllPitches ? "spielplan-all-pitches-break" : "spielplan-selected-pitches-break"
              }
            />
          );
        }

        const { group } = item;
        return (
          <section
            key={group.sectionId}
            aria-labelledby={`spielplan-round-${group.sectionId}`}
            data-testid={`spielplan-round-group-${group.sectionId}`}
            className={SCE_TOURNAMENT_ROUND_SURFACE_CLASS}
          >
            <SceTournamentRoundHeader
              headingId={`spielplan-round-${group.sectionId}`}
              title={group.title}
              metaLine={[group.timeRangeLabel, group.pitchSummaryLabel].filter(Boolean).join(" · ")}
              countLabel={fixtureCountLabel(group.fixtureCount)}
            />
            <ul className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:gap-4">
              {group.fixtures.map((fixture) => (
                <li key={fixture.fixtureId}>
                  <SceTournamentFixtureCard
                    fixture={fixture}
                    participants={participants}
                    density="compact"
                    highlightParticipantId={highlightParticipantId}
                    timezone={model.identity.timezone}
                    showFixtureTime={false}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
