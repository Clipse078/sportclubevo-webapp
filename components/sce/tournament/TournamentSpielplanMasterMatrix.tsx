"use client";

import type {
  TournamentSpielplanMatrixRow,
  TournamentSpielplanPitchCell,
  TournamentSpielplanPitchColumn,
  TournamentSpielplanViewModel,
} from "@/lib/tournaments/spielplan/types";
import { cn } from "@/lib/cn";

type Props = {
  model: TournamentSpielplanViewModel;
  highlightParticipantId?: string | null;
  subduedClassName?: string;
  highlightClassName?: string;
};

function cellPresentation(
  cell: TournamentSpielplanPitchCell,
  highlightParticipantId: string | null | undefined,
): { label: string; highlighted: boolean; subLabel: string | null } {
  if (cell.kind === "EMPTY") {
    return { label: "—", highlighted: false, subLabel: null };
  }
  if (cell.kind === "PITCH_BLOCKED") {
    return { label: cell.label, highlighted: false, subLabel: "gesperrt" };
  }
  const highlighted =
    highlightParticipantId != null &&
    (cell.sideAParticipantId === highlightParticipantId ||
      cell.sideBParticipantId === highlightParticipantId);
  const score = cell.result ? ` ${cell.result.scoreSideA}:${cell.result.scoreSideB}` : "";
  return { label: `${cell.pairingLabel}${score}`, highlighted, subLabel: null };
}

function MatrixRowCells({
  row,
  pitches,
  highlightParticipantId,
  subduedClassName,
  highlightClassName,
}: {
  row: Extract<TournamentSpielplanMatrixRow, { kind: "SCHEDULE_SLOT" }>;
  pitches: readonly TournamentSpielplanPitchColumn[];
  highlightParticipantId?: string | null;
  subduedClassName: string;
  highlightClassName: string;
}) {
  return (
    <>
      {pitches.map((pitch) => {
        const cell = row.cellsByPitchId[pitch.pitchId] ?? { kind: "EMPTY" as const };
        const { label, highlighted, subLabel } = cellPresentation(cell, highlightParticipantId);
        return (
          <td
            key={pitch.pitchId}
            className={cn(
              "border border-[var(--border)] px-2 py-2 align-top text-xs sm:text-sm",
              highlightParticipantId && !highlighted && cell.kind === "FIXTURE"
                ? subduedClassName
                : "",
              highlighted ? highlightClassName : "",
            )}
          >
            <span className="font-medium">{label}</span>
            {subLabel ? (
              <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {subLabel}
              </span>
            ) : null}
          </td>
        );
      })}
    </>
  );
}

export default function TournamentSpielplanMasterMatrix({
  model,
  highlightParticipantId = null,
  subduedClassName = "opacity-45",
  highlightClassName = "ring-2 ring-[var(--sce-focus)] bg-[var(--surface-2)] font-semibold",
}: Props) {
  const { pitches, matrixRows } = model;

  if (matrixRows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]" data-testid="spielplan-master-empty">
        Noch kein Spielplan verfügbar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="spielplan-master-matrix">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Zeit
            </th>
            {pitches.map((pitch) => (
              <th
                key={pitch.pitchId}
                className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {pitch.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrixRows.map((row) => {
            if (row.kind === "ALL_PITCHES_BREAK") {
              return (
                <tr key={row.rowId} data-testid="spielplan-all-pitches-break">
                  <td
                    colSpan={pitches.length + 1}
                    className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide"
                  >
                    {row.timeLabel} · {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.rowId}>
                <td className="border border-[var(--border)] px-2 py-2 text-sm whitespace-nowrap">
                  <div className="font-medium tabular-nums">{row.timeLabel}</div>
                  {row.roundTitle ? (
                    <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      {row.roundTitle}
                    </div>
                  ) : null}
                </td>
                <MatrixRowCells
                  row={row}
                  pitches={pitches}
                  highlightParticipantId={highlightParticipantId}
                  subduedClassName={subduedClassName}
                  highlightClassName={highlightClassName}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
