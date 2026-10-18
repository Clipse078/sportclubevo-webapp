"use client";

import type { TournamentSpielplanTeamPlan } from "@/lib/tournaments/spielplan/types";

type Props = {
  teamPlan: TournamentSpielplanTeamPlan;
  tournamentTitle: string;
  dateLabel: string;
};

export default function TournamentSpielplanTeamPlanView({
  teamPlan,
  tournamentTitle,
  dateLabel,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      data-testid="spielplan-team-plan"
      aria-labelledby="spielplan-team-plan-heading"
    >
      <header className="mb-4 space-y-1 border-b border-[var(--border)] pb-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{tournamentTitle}</p>
        <h3 id="spielplan-team-plan-heading" className="text-lg font-semibold">
          {teamPlan.displayName}
        </h3>
        <p className="text-sm text-[var(--text-2)]">{dateLabel}</p>
      </header>
      {teamPlan.entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine Spiele für dieses Team geplant.</p>
      ) : (
        <ol className="space-y-3">
          {teamPlan.entries.map((entry, index) => {
            if (entry.kind === "BREAK") {
              return (
                <li
                  key={`break-${entry.startUtc}-${index}`}
                  className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-[var(--text-2)]"> · {entry.timeLabel}</span>
                </li>
              );
            }
            return (
              <li
                key={entry.fixtureId}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <div className="font-medium tabular-nums">{entry.timeLabel}</div>
                <div className="text-[var(--text-2)]">{entry.pitchLabel}</div>
                <div>
                  vs {entry.opponentLabel}
                  {entry.scoreLabel ? (
                    <span className="ml-2 tabular-nums font-semibold">{entry.scoreLabel}</span>
                  ) : null}
                </div>
                {entry.roundTitle ? (
                  <div className="text-xs text-[var(--muted)]">{entry.roundTitle}</div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
