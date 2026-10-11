import {
  OPERATIONAL_ACTION_ACCENT_CLASS,
  OPERATIONAL_ACTION_NEUTRAL_CLASS,
} from "@/components/ui/operational-action-button-classes";

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
  "grid grid-cols-1 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_12rem_8.5rem_7.5rem] sm:items-center sm:gap-x-3";

export const MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS = "flex min-w-0 items-center gap-3";

export const MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS =
  "flex min-w-0 flex-col items-start justify-self-start gap-1";

export const MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS =
  "flex min-h-9 min-w-0 items-center justify-start sm:justify-end";

/** @deprecated Prefer OPERATIONAL_ACTION_ACCENT_CLASS — kept for row tests/imports. */
export const MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS = OPERATIONAL_ACTION_ACCENT_CLASS;

/** @deprecated Prefer OPERATIONAL_ACTION_NEUTRAL_CLASS — kept for row tests/imports. */
export const MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS = OPERATIONAL_ACTION_NEUTRAL_CLASS;
