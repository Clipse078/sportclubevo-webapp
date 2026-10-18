"use client";

import type {
  TournamentSpielplanMatrixRow,
  TournamentSpielplanPitchCell,
  TournamentSpielplanPitchColumn,
  TournamentSpielplanViewModel,
} from "@/lib/tournaments/spielplan/types";
import { cn } from "@/lib/cn";
import {
  SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS,
  SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER,
  SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS,
} from "@/lib/sce/tournament/sce-tournament-schedule-break-semantics";

type Props = {
  model: TournamentSpielplanViewModel;
  highlightParticipantId?: string | null;
  subduedClassName?: string;
  highlightClassName?: string;
};

function cellAccessibleLabel(
  cell: TournamentSpielplanPitchCell,
  pitchLabel: string,
  rowTimeLabel: string,
): string {
  if (cell.kind === "EMPTY") return `${rowTimeLabel}, ${pitchLabel}, frei`;
  if (cell.kind === "PITCH_BLOCKED") {
    return `${cell.label} ${rowTimeLabel}, ${pitchLabel}`;
  }
  const score =
    cell.result != null ? `, Ergebnis ${cell.result.scoreSideA}:${cell.result.scoreSideB}` : "";
  return `${rowTimeLabel}, ${pitchLabel}, ${cell.pairingLabel}${score}`;
}

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
            aria-label={cellAccessibleLabel(cell, pitch.label, row.timeLabel)}
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
      <table
        className="w-full min-w-[640px] border-collapse text-left"
        aria-label="Master-Spielplan Feld und Zeit"
      >
        <caption className="sr-only">
          Spielplan nach Zeit und Turnierfeldern
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Zeit
            </th>
            {pitches.map((pitch) => (
              <th
                key={pitch.pitchId}
                scope="col"
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
                  <td colSpan={pitches.length + 1} className="border border-[var(--border)] p-1">
                    <div
                      className={SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS}
                      data-sce-schedule-break={SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER}
                      aria-label={`${row.label} ${row.timeLabel}, alle Felder`}
                    >
                      <p className={SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS}>{row.label}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-[var(--text-2)]">
                        {row.timeLabel}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.rowId}>
                <th
                  scope="row"
                  className="border border-[var(--border)] px-2 py-2 text-sm whitespace-nowrap font-normal"
                >
                  <div className="font-medium tabular-nums">{row.timeLabel}</div>
                  {row.roundTitle ? (
                    <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      {row.roundTitle}
                    </div>
                  ) : null}
                </th>
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
