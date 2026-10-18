"use client";

import { cn } from "@/lib/cn";
import {
  SCE_TOURNAMENT_SCHEDULE_BREAK_BOARD_BAND_CLASS,
  SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS,
  SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER,
  SCE_TOURNAMENT_SCHEDULE_BREAK_META_CLASS,
  SCE_TOURNAMENT_SCHEDULE_BREAK_PITCH_CELL_CLASS,
  SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS,
} from "@/lib/sce/tournament/sce-tournament-schedule-break-semantics";

export type SceTournamentScheduleBreakLayout =
  | "spielplan-all-pitches"
  | "spielplan-selected-pitches"
  | "board-all-pitches"
  | "board-pitch";

type Props = {
  layout: SceTournamentScheduleBreakLayout;
  label: string;
  timeLabel: string;
  scopeLabel?: string | null;
  accessibleLabel?: string;
  testId?: string;
  className?: string;
};

function metaLine(timeLabel: string, scopeLabel?: string | null): string {
  if (scopeLabel?.trim()) {
    return `${timeLabel} · ${scopeLabel.trim()}`;
  }
  return timeLabel;
}

export default function SceTournamentScheduleBreakPresentation({
  layout,
  label,
  timeLabel,
  scopeLabel = null,
  accessibleLabel,
  testId,
  className,
}: Props) {
  const ariaLabel = accessibleLabel ?? `${label} ${metaLine(timeLabel, scopeLabel)}`;

  if (layout === "board-all-pitches") {
    return (
      <div
        className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_BOARD_BAND_CLASS, className)}
        data-sce-schedule-break={SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <p className={SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS}>{label}</p>
        <p className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_META_CLASS, "mt-0.5")}>
          {metaLine(timeLabel, scopeLabel ?? "Alle Felder")}
        </p>
      </div>
    );
  }

  if (layout === "board-pitch") {
    return (
      <div
        className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_PITCH_CELL_CLASS, className)}
        data-sce-schedule-break={SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <p className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS, "text-xs")}>{label}</p>
        <p className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_META_CLASS, "mt-0.5")}>{timeLabel}</p>
      </div>
    );
  }

  const surfaceClass =
    layout === "spielplan-all-pitches"
      ? SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS
      : cn(SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS, "text-left");

  return (
    <div
      className={cn(surfaceClass, className)}
      data-sce-schedule-break={SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER}
      aria-label={ariaLabel}
      data-testid={testId}
      role="status"
    >
      <p className={SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS}>{label}</p>
      <p className={cn(SCE_TOURNAMENT_SCHEDULE_BREAK_META_CLASS, "mt-0.5")}>{timeLabel}</p>
      {layout === "spielplan-selected-pitches" && scopeLabel ? (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{scopeLabel}</p>
      ) : null}
    </div>
  );
}
