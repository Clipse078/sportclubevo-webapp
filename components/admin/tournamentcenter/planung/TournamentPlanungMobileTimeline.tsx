"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Lock } from "lucide-react";

type Props = {
  model: TournamentPlanungViewModel;
  timezone: string;
};

export default function TournamentPlanungMobileTimeline({ model, timezone }: Props) {
  const pitchLabel = new Map(model.pitches.map((p) => [p.pitchId, p.label]));

  return (
    <ol className="space-y-2" data-testid="tournament-planung-mobile-timeline">
      {model.mobileTimeline.map((cell) => {
        const time = new Date(cell.startUtc).toLocaleTimeString("de-CH", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        });
        if (cell.kind === "BREAK") {
          return (
            <li
              key={cell.breakId}
              className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--muted)]"
              aria-label={cell.accessibleLabel}
            >
              {time} · {cell.label}
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
              {time} · {pitchLabel.get(cell.pitchId) ?? "Feld"}
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
  );
}
