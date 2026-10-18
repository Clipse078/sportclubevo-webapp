"use client";

import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";
import SceTournamentFixtureCard from "./SceTournamentFixtureCard";

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
            <div
              key={`break-${br.breakId}`}
              className={
                isAllPitches
                  ? "rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center"
                  : "rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
              }
              data-testid={
                isAllPitches ? "spielplan-all-pitches-break" : "spielplan-selected-pitches-break"
              }
              role="status"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {br.timeLabel} · {br.label}
              </p>
              <p className="text-xs text-[var(--muted)]">{br.scopeLabel}</p>
            </div>
          );
        }

        const { group } = item;
        return (
          <section
            key={group.sectionId}
            aria-labelledby={`spielplan-round-${group.sectionId}`}
            data-testid={`spielplan-round-group-${group.sectionId}`}
          >
            <header
              id={`spielplan-round-${group.sectionId}`}
              className="mb-3 flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">{group.title}</h4>
                <p className="text-xs text-[var(--muted)]">
                  {[group.timeRangeLabel, group.pitchSummaryLabel].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="text-xs font-medium text-[var(--text-2)]">
                {fixtureCountLabel(group.fixtureCount)}
              </p>
            </header>
            <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {group.fixtures.map((fixture) => (
                <li key={fixture.fixtureId}>
                  <SceTournamentFixtureCard
                    fixture={fixture}
                    participants={participants}
                    highlightParticipantId={highlightParticipantId}
                    timezone={model.identity.timezone}
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
