"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

type Props = {
  model: TournamentPlanungViewModel;
};

export default function TournamentPlanungGroupStandings({ model }: Props) {
  if (model.groupStandings.length === 0) return null;

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      data-testid="tournament-planung-group-standings"
      aria-label="Gruppentabellen"
    >
      {model.groupStandings.map((group) => (
        <div key={group.groupId} data-testid={`planung-standings-${group.groupId}`}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
            {group.groupLabel}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--muted)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Team</th>
                  <th className="py-1 px-1 tabular-nums">Sp</th>
                  <th className="py-1 px-1 tabular-nums">S</th>
                  <th className="py-1 px-1 tabular-nums">U</th>
                  <th className="py-1 px-1 tabular-nums">N</th>
                  <th className="py-1 px-1 tabular-nums">Tore</th>
                  <th className="py-1 px-1 tabular-nums">Diff</th>
                  <th className="py-1 pl-1 tabular-nums">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr
                    key={row.participantId}
                    className="border-t border-[var(--border)] text-[var(--foreground)]"
                  >
                    <td className="py-1 pr-2 tabular-nums">{row.position}</td>
                    <td className="py-1 pr-2 font-medium">{row.displayName}</td>
                    <td className="py-1 px-1 tabular-nums">{row.played}</td>
                    <td className="py-1 px-1 tabular-nums">{row.won}</td>
                    <td className="py-1 px-1 tabular-nums">{row.drawn}</td>
                    <td className="py-1 px-1 tabular-nums">{row.lost}</td>
                    <td className="py-1 px-1 tabular-nums">
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td className="py-1 px-1 tabular-nums">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-1 pl-1 tabular-nums font-semibold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-2 space-y-2 md:hidden">
            {group.rows.map((row) => (
              <li
                key={`m-${row.participantId}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2"
              >
                <p className="font-medium">
                  {row.position}. {row.displayName}
                </p>
                <p className="text-xs tabular-nums text-[var(--muted)]">
                  {row.played} Sp · {row.won}-{row.drawn}-{row.lost} · {row.goalsFor}:
                  {row.goalsAgainst} · {row.points} Pkt
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
