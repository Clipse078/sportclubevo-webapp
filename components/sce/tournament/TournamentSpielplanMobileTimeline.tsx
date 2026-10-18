"use client";

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";
import SceTournamentFixtureCard from "./SceTournamentFixtureCard";

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
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <header className="mb-2 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums">{slot.timeLabel}</span>
            {slot.roundTitle ? (
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {slot.roundTitle}
              </span>
            ) : null}
          </header>
          {slot.kind === "ALL_PITCHES_BREAK" ? (
            <p className="text-sm font-medium" data-testid="spielplan-mobile-all-pitches-break">
              {slot.breakLabel ?? "Pause"}
            </p>
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
                      />
                    </li>
                  );
                }
                if (cell.kind === "PITCH_BLOCKED") {
                  return (
                    <li
                      key={`${slot.slotId}-${entry.pitchLabel}-blocked`}
                      className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      data-testid="spielplan-mobile-pitch-blocked"
                    >
                      <span className="text-xs font-medium uppercase text-[var(--muted)]">
                        {entry.pitchLabel}
                      </span>
                      <p className="font-medium">{cell.label}</p>
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
