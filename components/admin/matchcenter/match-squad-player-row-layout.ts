/**
 * Shared desktop row geometry for Match Squad player rows (UAT R2.1).
 * Status column width fits longest canonical label «Nicht verfügbar».
 */
export const MATCH_SQUAD_PLAYER_ROW_LAYOUT = "match-squad-player-row-grid" as const;

/** Tailwind grid: player | fixed status | actions */
export const MATCH_SQUAD_PLAYER_ROW_GRID_CLASS =
  "grid grid-cols-1 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-start sm:gap-x-4";

export const MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS =
  "flex min-w-0 flex-col items-start gap-1 justify-self-start";

export const MATCH_SQUAD_PLAYER_ROW_ACTIONS_COLUMN_CLASS =
  "flex flex-wrap items-center justify-start gap-2 sm:justify-end sm:justify-self-end";
