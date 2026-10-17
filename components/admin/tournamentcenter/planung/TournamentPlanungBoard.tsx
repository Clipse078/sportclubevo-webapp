"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { resolveTimeRowIndex } from "@/lib/tournaments/planung/time-scale";
import { cn } from "@/lib/cn";
import { Lock } from "lucide-react";

type Props = {
  model: TournamentPlanungViewModel;
  timezone: string;
  selectedFixtureId: string | null;
  onSelectFixture: (fixtureId: string | null) => void;
};

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export default function TournamentPlanungBoard({
  model,
  timezone,
  selectedFixtureId,
  onSelectFixture,
}: Props) {
  const timeScale = model.timeScale!;
  const fixtureCells = model.cells.filter((c) => c.kind === "FIXTURE");
  const breakCells = model.cells.filter((c) => c.kind === "BREAK");

  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="tournament-planung-board"
      role="grid"
      aria-label="Spielplan Feld und Zeit"
    >
      <div
        className="min-w-max"
        style={{
          display: "grid",
          gridTemplateColumns: `4.5rem repeat(${model.pitches.length}, minmax(8rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Zeit
        </div>
        {model.pitches.map((pitch) => (
          <div
            key={pitch.pitchId}
            className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-center text-xs font-semibold text-[var(--foreground)]"
          >
            {pitch.label}
          </div>
        ))}

        {timeScale.rowAnchorsUtc.map((anchor) => (
          <div key={`row-${anchor}`} className="contents">
            <div
              className="sticky left-0 border-r border-b border-[var(--border)] bg-[var(--surface)] p-2 text-xs tabular-nums text-[var(--muted)]"
            >
              {formatTime(anchor, timezone)}
            </div>
            {model.pitches.map((pitch) => {
              const fixture = fixtureCells.find(
                (c) =>
                  c.pitchId === pitch.pitchId &&
                  resolveTimeRowIndex(timeScale, c.startUtc) ===
                    resolveTimeRowIndex(timeScale, anchor) &&
                  c.startUtc === anchor,
              );
              const br = breakCells.find(
                (b) =>
                  b.startUtc === anchor &&
                  (b.scope === "ALL_PITCHES" || b.pitchIds.includes(pitch.pitchId)),
              );

              if (br) {
                return (
                  <div
                    key={`${anchor}-${pitch.pitchId}-break`}
                    className="border-b border-[var(--border)] p-1"
                    role="gridcell"
                    aria-label={br.accessibleLabel}
                  >
                    <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-3 text-center text-xs text-[var(--muted)]">
                      {br.label}
                    </div>
                  </div>
                );
              }

              if (!fixture) {
                return (
                  <div
                    key={`${anchor}-${pitch.pitchId}-empty`}
                    className="border-b border-[var(--border)] p-1"
                  />
                );
              }

              const selected = selectedFixtureId === fixture.fixtureId;
              return (
                <div key={`${anchor}-${pitch.pitchId}`} className="border-b border-[var(--border)] p-1">
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-2 py-2 text-left text-xs transition-colors",
                      "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)]",
                      selected && "ring-2 ring-[var(--accent)]",
                    )}
                    aria-label={fixture.accessibleLabel}
                    data-testid={`planung-fixture-${fixture.fixtureId}`}
                    onClick={() => onSelectFixture(fixture.fixtureId)}
                  >
                    <p className="truncate font-medium text-[var(--foreground)]">{fixture.sideA.label}</p>
                    <p className="truncate text-[var(--muted)]">{fixture.sideB.label}</p>
                    {fixture.lockDimension ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
                        <Lock className="h-3 w-3" aria-hidden />
                        Gesperrt
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
