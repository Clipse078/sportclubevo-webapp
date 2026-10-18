"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Lock } from "lucide-react";
import SceTournamentFixtureCompactMatchup from "@/components/sce/tournament/SceTournamentFixtureCompactMatchup";
import { cn } from "@/lib/cn";

type Props = {
  model: TournamentPlanungViewModel;
  timezone: string;
};

function formatTimeRange(startUtc: string, endUtc: string, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  return `${new Date(startUtc).toLocaleTimeString("de-CH", opts)}–${new Date(endUtc).toLocaleTimeString("de-CH", opts)}`;
}

function fixtureCountLabel(count: number): string {
  const fixtures = count;
  return fixtures === 1 ? "1 Spiel" : `${fixtures} Spiele`;
}

export default function TournamentPlanungScheduleList({ model, timezone }: Props) {
  const pitchLabel = new Map(model.pitches.map((p) => [p.pitchId, p.label]));

  if (model.scheduleSections.length === 0) return null;

  return (
    <section
      className="space-y-5"
      data-testid="tournament-planung-schedule-sections"
      aria-label="Spielplan nach Runden"
    >
      {model.scheduleSections.map((section) => {
        const fixtureEntries = section.entries.filter((e) => e.kind === "FIXTURE");
        return (
          <div key={section.sectionId} data-testid={`planung-section-${section.sectionId}`}>
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
              {fixtureEntries.length > 0 ? (
                <p className="text-xs font-medium text-[var(--text-2)]">
                  {fixtureCountLabel(fixtureEntries.length)}
                </p>
              ) : null}
            </header>
            <ul className="space-y-2">
              {section.entries.map((entry) => {
                if (entry.kind === "BREAK") {
                  return (
                    <li
                      key={entry.breakId}
                      className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--muted)]"
                      aria-label={entry.accessibleLabel}
                      data-testid={`planung-break-${entry.breakId}`}
                    >
                      {entry.accessibleLabel}
                    </li>
                  );
                }
                const completed =
                  entry.result?.state === "COMPLETED" &&
                  entry.result.scoreSideA != null &&
                  entry.result.scoreSideB != null;
                return (
                  <li
                    key={entry.fixtureId}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/90 px-3 py-2.5 shadow-sm"
                    aria-label={entry.accessibleLabel}
                    data-testid={`planung-schedule-fixture-${entry.fixtureId}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs tabular-nums text-[var(--muted)]">
                        {formatTimeRange(entry.startUtc, entry.endUtc, timezone)} ·{" "}
                        {pitchLabel.get(entry.pitchId) ?? "Feld"}
                      </p>
                      {completed ? (
                        <p
                          className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]"
                          aria-label={`Ergebnis ${entry.result!.scoreSideA} zu ${entry.result!.scoreSideB}`}
                        >
                          {entry.result!.scoreSideA}:{entry.result!.scoreSideB}
                        </p>
                      ) : null}
                    </div>
                    <div className={cn("mt-2 min-w-0")}>
                      <SceTournamentFixtureCompactMatchup
                        sideA={entry.sideA}
                        sideB={entry.sideB}
                        layout="inline"
                      />
                    </div>
                    {entry.lockDimension ? (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Lock className="h-3 w-3" aria-hidden />
                        Gesperrt
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
