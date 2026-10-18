"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Lock } from "lucide-react";

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

export default function TournamentPlanungScheduleList({ model, timezone }: Props) {
  const pitchLabel = new Map(model.pitches.map((p) => [p.pitchId, p.label]));

  if (model.scheduleSections.length === 0) return null;

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      data-testid="tournament-planung-schedule-sections"
      aria-label="Spielplan nach Runden"
    >
      {model.scheduleSections.map((section) => (
        <div key={section.sectionId} data-testid={`planung-section-${section.sectionId}`}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
          <ul className="mt-2 space-y-2">
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
              return (
                <li
                  key={entry.fixtureId}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2"
                  aria-label={entry.accessibleLabel}
                  data-testid={`planung-schedule-fixture-${entry.fixtureId}`}
                >
                  <p className="text-xs tabular-nums text-[var(--muted)]">
                    {formatTimeRange(entry.startUtc, entry.endUtc, timezone)} ·{" "}
                    {pitchLabel.get(entry.pitchId) ?? "Feld"}
                  </p>
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span>
                        {entry.sideA.label}
                        {entry.sideA.qualificationProvenanceLabel ? (
                          <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                            ({entry.sideA.qualificationProvenanceLabel})
                          </span>
                        ) : null}
                      </span>
                      {entry.result?.state === "COMPLETED" &&
                      entry.result.scoreSideA != null ? (
                        <span className="tabular-nums">{entry.result.scoreSideA}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span>
                        {entry.sideB.label}
                        {entry.sideB.qualificationProvenanceLabel ? (
                          <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                            ({entry.sideB.qualificationProvenanceLabel})
                          </span>
                        ) : null}
                      </span>
                      {entry.result?.state === "COMPLETED" &&
                      entry.result.scoreSideB != null ? (
                        <span className="tabular-nums">{entry.result.scoreSideB}</span>
                      ) : null}
                    </div>
                  </div>
                  {entry.lockDimension ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Lock className="h-3 w-3" aria-hidden />
                      Gesperrt
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
