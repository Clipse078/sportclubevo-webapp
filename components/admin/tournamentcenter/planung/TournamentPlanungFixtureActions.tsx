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
  onEnterResult: () => void;
  onClose: () => void;
};

export default function TournamentPlanungFixtureActions({
  model,
  fixtureId,
  busy,
  onLockAction,
  onManualMove,
  onEnterResult,
  onClose,
}: Props) {
  const cell = model.cells.find(
    (c) => c.kind === "FIXTURE" && c.fixtureId === fixtureId,
  );
  if (!cell || cell.kind !== "FIXTURE") return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
      data-testid="tournament-planung-fixture-actions"
    >
      <span className="text-sm text-[var(--foreground)]">
        {cell.sideA.label} – {cell.sideB.label}
        {cell.result?.state === "COMPLETED" &&
        cell.result.scoreSideA != null &&
        cell.result.scoreSideB != null ? (
          <span className="ml-2 tabular-nums font-semibold">
            {cell.result.scoreSideA}:{cell.result.scoreSideB}
          </span>
        ) : null}
      </span>
      {cell.canEnterResult ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          data-testid="tournament-planung-result-open"
          onClick={onEnterResult}
        >
          Ergebnis
        </Button>
      ) : null}
      {cell.assignmentId ? (
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
      ) : null}
      {cell.assignmentId
        ? (["TIME", "PITCH", "TIME_AND_PITCH"] as const).map((dimension) => (
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
          ))
        : null}
      {cell.assignmentId ? (
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
      ) : null}
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        Schliessen
      </Button>
    </div>
  );
}
