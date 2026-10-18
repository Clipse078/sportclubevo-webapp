import { cn } from "@/lib/cn";

/**
 * Canonical SCE tournament schedule break (Pause / Sperrzeit).
 * Schedule structure — not a fixture, error, or alert.
 */
export const SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER = "sce-schedule-break";

export const SCE_TOURNAMENT_SCHEDULE_BREAK_SURFACE_CLASS = cn(
  "border border-[var(--sce-warning-border)]/55 bg-[var(--sce-warning-light)]/75",
  "border-l-[3px] border-l-[var(--sce-warning)]/65",
);

/** Full-width band in Feld- und Zeitplan (ALL_PITCHES). */
export const SCE_TOURNAMENT_SCHEDULE_BREAK_BOARD_BAND_CLASS = cn(
  SCE_TOURNAMENT_SCHEDULE_BREAK_SURFACE_CLASS,
  "rounded-md px-3 py-2.5 text-center",
);

/** Standalone interruption between rounds (Spielplan). */
export const SCE_TOURNAMENT_SCHEDULE_BREAK_SPIELPLAN_BLOCK_CLASS = cn(
  SCE_TOURNAMENT_SCHEDULE_BREAK_SURFACE_CLASS,
  "rounded-[var(--radius-lg)] px-4 py-3 text-center",
);

/** Single TournamentPitch cell during SELECTED_PITCHES Sperrzeit. */
export const SCE_TOURNAMENT_SCHEDULE_BREAK_PITCH_CELL_CLASS = cn(
  SCE_TOURNAMENT_SCHEDULE_BREAK_SURFACE_CLASS,
  "rounded-md px-2 py-2.5 text-center",
);

export const SCE_TOURNAMENT_SCHEDULE_BREAK_LABEL_CLASS =
  "text-sm font-semibold tracking-tight text-[var(--foreground)]";

export const SCE_TOURNAMENT_SCHEDULE_BREAK_META_CLASS =
  "text-xs tabular-nums text-[var(--text-2)]";
