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

export default function TournamentPlanungMobileTimeline({ model, timezone }: Props) {
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
        <section key={section.sectionId}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
          <ol className="mt-2 space-y-2">
            {section.entries.map((cell) => {
              if (cell.kind === "BREAK") {
                return (
                  <li
                    key={cell.breakId}
                    className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--muted)]"
                    aria-label={cell.accessibleLabel}
                  >
                    {cell.accessibleLabel}
                  </li>
                );
              }
              return (
                <li
                  key={cell.fixtureId}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  aria-label={cell.accessibleLabel}
                >
                  <p className="text-xs text-[var(--muted)]">
                    {formatTimeRange(cell.startUtc, cell.endUtc, timezone)} ·{" "}
                    {pitchLabel.get(cell.pitchId) ?? "Feld"}
                  </p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {cell.sideA.label} – {cell.sideB.label}
                  </p>
                  {cell.lockDimension ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Lock className="h-3 w-3" aria-hidden />
                      Gesperrt
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
