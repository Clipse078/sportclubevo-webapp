"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Lock } from "lucide-react";
import SceTournamentFixturePresentation from "@/components/sce/tournament/SceTournamentFixturePresentation";
import SceTournamentScheduleBreakPresentation from "@/components/sce/tournament/SceTournamentScheduleBreakPresentation";
import {
  SCE_TOURNAMENT_ROUND_COUNT_BADGE_CLASS,
  SCE_TOURNAMENT_ROUND_SURFACE_CLASS,
} from "@/lib/sce/tournament/sce-tournament-surface-layout";

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
  const pitchFormatHint = new Map(model.pitches.map((p) => [p.pitchId, p.formatHint]));

  if (model.scheduleSections.length === 0) return null;

  return (
    <section
      className="space-y-4"
      data-testid="tournament-planung-schedule-sections"
      aria-label="Spielplan nach Runden"
    >
      {model.scheduleSections.map((section) => {
        const fixtureEntries = section.entries.filter((e) => e.kind === "FIXTURE");
        return (
          <div
            key={section.sectionId}
            data-testid={`planung-section-${section.sectionId}`}
            className={SCE_TOURNAMENT_ROUND_SURFACE_CLASS}
          >
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
              {fixtureEntries.length > 0 ? (
                <span className={SCE_TOURNAMENT_ROUND_COUNT_BADGE_CLASS}>
                  {fixtureCountLabel(fixtureEntries.length)}
                </span>
              ) : null}
            </header>
            <ul className="space-y-2.5">
              {section.entries.map((entry) => {
                if (entry.kind === "BREAK") {
                  return (
                    <li key={entry.breakId} role="listitem">
                      <SceTournamentScheduleBreakPresentation
                        layout="spielplan-all-pitches"
                        label={entry.label}
                        timeLabel={formatTimeRange(entry.startUtc, entry.endUtc, timezone)}
                        accessibleLabel={entry.accessibleLabel}
                        testId={`planung-break-${entry.breakId}`}
                      />
                    </li>
                  );
                }
                const completed =
                  entry.result?.state === "COMPLETED" &&
                  entry.result.scoreSideA != null &&
                  entry.result.scoreSideB != null;
                const pitch = pitchLabel.get(entry.pitchId) ?? "Feld";
                const formatHint = pitchFormatHint.get(entry.pitchId);
                const pitchWithHint = formatHint ? `${pitch} · ${formatHint}` : pitch;

                return (
                  <li key={entry.fixtureId} role="listitem">
                    <SceTournamentFixturePresentation
                      density="compact"
                      sideA={entry.sideA}
                      sideB={entry.sideB}
                      timeLabel={formatTimeRange(entry.startUtc, entry.endUtc, timezone)}
                      pitchLabel={pitchWithHint}
                      result={
                        completed
                          ? {
                              scoreSideA: entry.result!.scoreSideA!,
                              scoreSideB: entry.result!.scoreSideB!,
                            }
                          : null
                      }
                      accessibleLabel={entry.accessibleLabel}
                      testId={`planung-schedule-fixture-${entry.fixtureId}`}
                      footer={
                        entry.lockDimension ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                            <Lock className="h-3 w-3" aria-hidden />
                            Gesperrt
                          </p>
                        ) : null
                      }
                    />
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
