import type { TournamentSpielplanTeamPlan, TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

type Props = {
  model: TournamentSpielplanViewModel;
  teamPlan: TournamentSpielplanTeamPlan;
  dataTestId?: string;
};

export default function SceTournamentTeamSpielplanDocument({
  model,
  teamPlan,
  dataTestId = "sce-tournament-team-spielplan-document",
}: Props) {
  const { identity } = model;

  return (
    <article
      data-testid={dataTestId}
      className="mx-auto max-w-[640px] bg-white px-8 py-10 text-neutral-900 print:px-6 print:py-8"
    >
      <header className="mb-6 border-b border-neutral-300 pb-4">
        {identity.tenantName ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            {identity.tenantName}
          </p>
        ) : null}
        <h1 className="text-xl font-bold">{identity.title}</h1>
        <p className="text-sm text-neutral-700">{identity.dateLabel}</p>
        <h2 className="mt-3 text-lg font-semibold">{teamPlan.displayName}</h2>
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Team-Spielplan
        </p>
      </header>
      <ol className="space-y-2 text-sm">
        {teamPlan.entries.map((entry, index) => {
          if (entry.kind === "BREAK") {
            return (
              <li
                key={`b-${index}`}
                className="rounded border border-dashed border-neutral-400 px-3 py-2 font-medium"
              >
                {entry.label} · {entry.timeLabel}
              </li>
            );
          }
          return (
            <li key={entry.fixtureId} className="border border-neutral-300 px-3 py-2">
              <div className="font-semibold">{entry.timeLabel}</div>
              <div>{entry.pitchLabel}</div>
              <div>
                vs {entry.opponentLabel}
                {entry.scoreLabel ? ` · ${entry.scoreLabel}` : ""}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
