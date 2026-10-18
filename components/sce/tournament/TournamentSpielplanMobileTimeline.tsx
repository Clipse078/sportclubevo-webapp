"use client";

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

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

  return (
    <div className="space-y-4 lg:hidden" data-testid="spielplan-mobile-timeline">
      {model.mobileSlots.map((slot) => (
        <section key={slot.slotId} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <header className="mb-2 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums">{slot.timeLabel}</span>
            {slot.roundTitle ? (
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {slot.roundTitle}
              </span>
            ) : null}
          </header>
          {slot.kind === "ALL_PITCHES_BREAK" ? (
            <p className="text-sm font-medium">{slot.breakLabel ?? "Pause"}</p>
          ) : (
            <ul className="space-y-2">
              {slot.pitches.map((entry) => {
                const cell = entry.cell;
                let label = "—";
                let highlighted = false;
                if (cell.kind === "FIXTURE") {
                  label = cell.pairingLabel;
                  if (cell.result) {
                    label += ` (${cell.result.scoreSideA}:${cell.result.scoreSideB})`;
                  }
                  highlighted =
                    highlightParticipantId != null &&
                    (cell.sideAParticipantId === highlightParticipantId ||
                      cell.sideBParticipantId === highlightParticipantId);
                } else if (cell.kind === "PITCH_BLOCKED") {
                  label = cell.label;
                }
                return (
                  <li
                    key={`${slot.slotId}-${entry.pitchLabel}`}
                    className={highlighted ? "font-semibold underline decoration-2" : ""}
                  >
                    <span className="text-xs font-medium uppercase text-[var(--muted)]">
                      {entry.pitchLabel}
                    </span>
                    <p className="text-sm">{label}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
