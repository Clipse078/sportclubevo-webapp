"use client";

import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { scheduleLockActionLabel } from "@/lib/tournaments/planung/planung-presentation";
import { Button } from "@/components/ui/Button";

type Props = {
  tournamentId: string;
  model: TournamentPlanungViewModel;
  fixtureId: string;
  busy: boolean;
  onLockAction: (body: Record<string, unknown>) => Promise<void>;
  onManualMove: () => void;
  onClose: () => void;
};

export default function TournamentPlanungFixtureActions({
  model,
  fixtureId,
  busy,
  onLockAction,
  onManualMove,
  onClose,
}: Props) {
  const cell = model.cells.find(
    (c) => c.kind === "FIXTURE" && c.fixtureId === fixtureId,
  );
  if (!cell || cell.kind !== "FIXTURE" || !cell.assignmentId) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
      data-testid="tournament-planung-fixture-actions"
    >
      <span className="text-sm text-[var(--foreground)]">
        {cell.sideA.label} – {cell.sideB.label}
      </span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        data-testid="tournament-planung-manual-move-open"
        onClick={onManualMove}
      >
        Spiel verschieben
      </Button>
      {(["TIME", "PITCH", "TIME_AND_PITCH"] as const).map((dimension) => (
        <Button
          key={dimension}
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            onLockAction({
              assignmentId: cell.assignmentId,
              dimension,
              scheduleVersionId: model.scheduleVersionId,
              expectedRevision: model.scheduleRevision,
            })
          }
        >
          {scheduleLockActionLabel(dimension)}
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() =>
          onLockAction({
            assignmentId: cell.assignmentId,
            dimension: null,
            scheduleVersionId: model.scheduleVersionId,
            expectedRevision: model.scheduleRevision,
          })
        }
      >
        Sperre aufheben
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        Schliessen
      </Button>
    </div>
  );
}
