/**
 * Shared desktop row geometry for Match Squad player rows.
 *
 * R2.1 used `auto` for the action track — each `<ul>` is its own grid, so track
 * widths were computed per section (Aufgeboten vs Weitere Kaderspieler). Wider
 * action content in Aufgeboten shifted the status column start relative to the
 * other section. R2.2 uses fixed player | status | action tracks and always
 * renders the action cell (even when empty).
 */
export const MATCH_SQUAD_PLAYER_ROW_LAYOUT = "match-squad-player-row-grid" as const;

/** Fixed tracks: flexible player · status · squad action (never `auto`). */
export const MATCH_SQUAD_PLAYER_ROW_GRID_CLASS =
  "grid grid-cols-1 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_12rem_8.5rem] sm:items-center sm:gap-x-4";

export const MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS = "flex min-w-0 items-center gap-3";

export const MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS =
  "flex min-w-0 flex-col items-start justify-self-start gap-1";

export const MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS =
  "flex min-h-9 min-w-0 items-center justify-start sm:justify-end";

export const MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS =
  "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--sce-success-border)] bg-[var(--sce-success-light)] px-3 py-1.5 text-xs font-semibold text-[var(--sce-success)] transition hover:bg-[var(--sce-success-light)]/80 disabled:opacity-50";

export const MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS =
  "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--sce-danger-border)] bg-[var(--sce-danger-light)] px-3 py-1.5 text-xs font-semibold text-[var(--sce-danger)] transition hover:bg-[var(--sce-danger-light)]/80 disabled:opacity-50";
