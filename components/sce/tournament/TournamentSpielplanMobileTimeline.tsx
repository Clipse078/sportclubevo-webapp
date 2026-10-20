"use client";

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";
import SceTournamentFixtureCard from "./SceTournamentFixtureCard";
import { SCE_TOURNAMENT_ROUND_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import SceTournamentScheduleBreakPresentation from "./SceTournamentScheduleBreakPresentation";

type Props = {
  model: TournamentSpielplanViewModel;
  highlightParticipantId?: string | null;
};

export default function TournamentSpielplanMobileTimeline({
  model,
  highlightParticipantId = null,
}: Props) {
  if (model.mobileSlots.length === 0) {
    return null;
  }

  const fixtureById = new Map(model.fixtures.map((f) => [f.fixtureId, f]));

  return (
    <div className="space-y-4 lg:hidden" data-testid="spielplan-mobile-timeline">
      {model.mobileSlots.map((slot) => (
        <section
          key={slot.slotId}
          className={SCE_TOURNAMENT_ROUND_SURFACE_CLASS}
          aria-labelledby={`spielplan-mobile-slot-${slot.slotId}`}
        >
          <header
            id={`spielplan-mobile-slot-${slot.slotId}`}
            className="mb-2 flex flex-wrap items-baseline gap-2"
          >
            <span className="text-sm font-semibold tabular-nums">{slot.timeLabel}</span>
            {slot.roundTitle ? (
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {slot.roundTitle}
              </span>
            ) : null}
          </header>
          {slot.kind === "ALL_PITCHES_BREAK" ? (
            <SceTournamentScheduleBreakPresentation
              layout="spielplan-all-pitches"
              label={slot.breakLabel ?? "Pause"}
              timeLabel={slot.timeLabel}
              accessibleLabel={`${slot.breakLabel ?? "Pause"} ${slot.timeLabel}, alle Felder`}
              testId="spielplan-mobile-all-pitches-break"
            />
          ) : (
            <ul className="space-y-2">
              {slot.pitches.map((entry) => {
                const cell = entry.cell;
                if (cell.kind === "FIXTURE") {
                  const fixture = fixtureById.get(cell.fixtureId);
                  if (!fixture) return null;
                  return (
                    <li key={`${slot.slotId}-${entry.pitchLabel}-${cell.fixtureId}`}>
                      <SceTournamentFixtureCard
                        fixture={fixture}
                        participants={model.participants}
                        density="compact"
                        highlightParticipantId={highlightParticipantId}
                        timezone={model.identity.timezone}
                        showFixtureTime={false}
                      />
                    </li>
                  );
                }
                if (cell.kind === "PITCH_BLOCKED") {
                  return (
                    <li key={`${slot.slotId}-${entry.pitchLabel}-blocked`}>
                      <SceTournamentScheduleBreakPresentation
                        layout="spielplan-selected-pitches"
                        label={cell.label}
                        timeLabel={slot.timeLabel}
                        scopeLabel={entry.pitchLabel}
                        accessibleLabel={`${cell.label} ${slot.timeLabel}, ${entry.pitchLabel}`}
                        testId="spielplan-mobile-pitch-blocked"
                      />
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
