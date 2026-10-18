"use client";

import { useMemo, useState } from "react";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { Button } from "@/components/ui/Button";
import { SwitchToggle } from "@/components/ui/SwitchToggle";

type Props = {
  model: TournamentPlanungViewModel;
  fixtureId: string;
  busy: boolean;
  onSave: (payload: {
    action: "record" | "clear";
    scoreSideA?: number;
    scoreSideB?: number;
    explicitWinnerParticipantId?: string | null;
    expectedRevision: number | null;
  }) => Promise<void>;
  onClose: () => void;
};

export default function TournamentPlanungResultDialog({
  model,
  fixtureId,
  busy,
  onSave,
  onClose,
}: Props) {
  const cell = model.cells.find((c) => c.kind === "FIXTURE" && c.fixtureId === fixtureId);
  const [scoreA, setScoreA] = useState(
    cell && cell.kind === "FIXTURE" ? String(cell.result?.scoreSideA ?? 0) : "0",
  );
  const [scoreB, setScoreB] = useState(
    cell && cell.kind === "FIXTURE" ? String(cell.result?.scoreSideB ?? 0) : "0",
  );
  const [pickWinnerB, setPickWinnerB] = useState(false);

  const sideIds = useMemo(() => {
    if (!cell || cell.kind !== "FIXTURE") {
      return { a: null as string | null, b: null as string | null, knockout: false };
    }
    return {
      a: cell.sideA.participantId,
      b: cell.sideB.participantId,
      knockout: cell.phaseType === "KNOCKOUT",
    };
  }, [cell]);

  if (!cell || cell.kind !== "FIXTURE" || !cell.canEnterResult) return null;

  const parsedA = Number.parseInt(scoreA, 10);
  const parsedB = Number.parseInt(scoreB, 10);
  const isDraw = parsedA === parsedB;
  const needsExplicitWinner = isDraw && sideIds.knockout;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      data-testid="tournament-planung-result-dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-lg">
        <h3 className="text-base font-semibold text-[var(--foreground)]">Ergebnis erfassen</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {cell.sideA.label} vs {cell.sideB.label}
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">{cell.sideA.label}</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 tabular-nums"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              data-testid="tournament-planung-result-score-a"
            />
          </label>
          <span className="pt-6 text-sm text-[var(--muted)]">:</span>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">{cell.sideB.label}</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 tabular-nums"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              data-testid="tournament-planung-result-score-b"
            />
          </label>
        </div>
        {needsExplicitWinner ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-sm text-[var(--foreground)]">
              K.-o.-Unentschieden — Sieger explizit festlegen:
            </p>
            <div className="mt-2">
              <SwitchToggle
                id="tournament-planung-ko-winner-side-b"
                label={cell.sideB.label}
                checked={pickWinnerB}
                onChange={setPickWinnerB}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                {pickWinnerB ? `Sieger: ${cell.sideB.label}` : `Sieger: ${cell.sideA.label}`}
              </p>
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {cell.result?.state === "COMPLETED" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              data-testid="tournament-planung-result-clear"
              onClick={() =>
                onSave({
                  action: "clear",
                  expectedRevision: cell.result?.revision ?? 0,
                })
              }
            >
              Ergebnis löschen
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || Number.isNaN(parsedA) || Number.isNaN(parsedB)}
            data-testid="tournament-planung-result-save"
            onClick={() =>
              onSave({
                action: "record",
                scoreSideA: parsedA,
                scoreSideB: parsedB,
                expectedRevision: cell.result?.revision ?? 0,
                explicitWinnerParticipantId: needsExplicitWinner
                  ? pickWinnerB
                    ? sideIds.b
                    : sideIds.a
                  : null,
              })
            }
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
