"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Lock } from "lucide-react";
import SceTournamentFixtureCompactMatchup from "@/components/sce/tournament/SceTournamentFixtureCompactMatchup";
import {
  SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS,
  SCE_TOURNAMENT_ROUND_SURFACE_CLASS,
} from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { cn } from "@/lib/cn";
import SceTournamentScheduleBreakPresentation from "@/components/sce/tournament/SceTournamentScheduleBreakPresentation";

type Props = {
  model: TournamentPlanungViewModel;
  timezone: string;
  canManage?: boolean;
  onSelectFixture?: (fixtureId: string) => void;
};

function formatTimeRange(startUtc: string, endUtc: string, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  };
  return `${new Date(startUtc).toLocaleTimeString("de-CH", opts)}–${new Date(endUtc).toLocaleTimeString("de-CH", opts)}`;
}

export default function TournamentPlanungMobileTimeline({
  model,
  timezone,
  canManage = false,
  onSelectFixture,
}: Props) {
  const pitchLabel = new Map(model.pitches.map((p) => [p.pitchId, p.label]));
  const sections =
    model.scheduleSections.length > 0
      ? model.scheduleSections
      : [
          {
            sectionId: "chronological",
            title: "Spielplan",
            entries: model.mobileTimeline,
          },
        ];

  return (
    <div className="space-y-4" data-testid="tournament-planung-mobile-timeline">
      {sections.map((section) => (
        <section key={section.sectionId} className={SCE_TOURNAMENT_ROUND_SURFACE_CLASS}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
          <ol className="mt-3 space-y-2.5">
            {section.entries.map((cell) => {
              if (cell.kind === "BREAK") {
                const timeLabel = formatTimeRange(cell.startUtc, cell.endUtc, timezone);
                return (
                  <li key={cell.breakId} data-testid={`planung-mobile-break-${cell.breakId}`}>
                    <SceTournamentScheduleBreakPresentation
                      layout={
                        cell.scope === "ALL_PITCHES" ? "board-all-pitches" : "spielplan-selected-pitches"
                      }
                      label={cell.label}
                      timeLabel={timeLabel}
                      scopeLabel={cell.scope === "ALL_PITCHES" ? "Alle Felder" : "Ausgewählte Felder"}
                      accessibleLabel={cell.accessibleLabel}
                    />
                  </li>
                );
              }
              return (
                <li key={cell.fixtureId}>
                  <button
                    type="button"
                    className={cn(
                      SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS,
                      "w-full rounded-lg px-3 py-3 text-left",
                    )}
                    aria-label={cell.accessibleLabel}
                    data-testid={`planung-mobile-fixture-${cell.fixtureId}`}
                    onClick={() => onSelectFixture?.(cell.fixtureId)}
                  >
                    <p className="text-xs text-[var(--muted)]">
                      {formatTimeRange(cell.startUtc, cell.endUtc, timezone)} ·{" "}
                      {pitchLabel.get(cell.pitchId) ?? "Feld"}
                    </p>
                    <div className="mt-1.5 min-w-0">
                      <SceTournamentFixtureCompactMatchup
                        sideA={cell.sideA}
                        sideB={cell.sideB}
                        layout="inline"
                      />
                    </div>
                    {cell.lockDimension ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Lock className="h-3 w-3" aria-hidden />
                        Gesperrt
                      </p>
                    ) : null}
                    {canManage ? (
                      <p className="mt-2 text-xs text-[var(--accent)]">Spiel verschieben</p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
