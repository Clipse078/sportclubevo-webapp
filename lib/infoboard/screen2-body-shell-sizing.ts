/**
 * lib/infoboard/screen2-body-shell-sizing.ts
 *
 * SCE-INFOBOARD-V2-01-R21 — full-width Screen 2 body geometry for the 1920×1080
 * logical kiosk canvas.
 *
 * Layout: full-width center content between shared header and footer.
 */

import {
  KIOSK_LOGICAL_HEIGHT,
  KIOSK_LOGICAL_WIDTH,
} from "@/lib/infoboard/kiosk-viewport";
import {
  KIOSK_SHELL_FOOTER_HEIGHT_PX,
  KIOSK_SHELL_HEADER_BORDER_PX,
  KIOSK_SHELL_HEADER_HEIGHT_PX,
  KIOSK_SHELL_SUBTITLE_HEIGHT_PX,
} from "@/lib/infoboard/kiosk-shell-sizing";

/** Horizontal padding inside the Screen 2 body shell. */
export const SCREEN2_BODY_PADDING_X_PX = 16;

/** Vertical padding inside the Screen 2 body shell. */
export const SCREEN2_BODY_PADDING_Y_PX = 8;

/** @deprecated Sponsor rails removed from Screen 2 presentation (R21). */
export const SCREEN2_BODY_COLUMN_GAP_PX = 0;

/** @deprecated Sponsor rails removed from Screen 2 presentation (R21). */
export const SCREEN2_SPONSOR_RAIL_SHARE = 0;

/** @deprecated Sponsor rails removed from Screen 2 presentation (R21). */
export const SCREEN2_CENTER_SHARE = 1;

const SCREEN2_BODY_INNER_WIDTH_PX =
  KIOSK_LOGICAL_WIDTH - SCREEN2_BODY_PADDING_X_PX * 2;

/** @deprecated Sponsor rails removed from Screen 2 presentation (R21). */
export const SCREEN2_SPONSOR_RAIL_WIDTH_PX = 0;

/** @deprecated Sponsor rails removed from Screen 2 presentation (R21). */
export const SCREEN2_RIGHT_SPONSOR_RAIL_WIDTH_PX = 0;

/** Full-width center column at the logical canvas. */
export const SCREEN2_CENTER_WIDTH_PX = SCREEN2_BODY_INNER_WIDTH_PX;

/** Header stack height when the subtitle strip is visible. */
export const SCREEN2_HEADER_STACK_WITH_SUBTITLE_PX =
  KIOSK_SHELL_HEADER_HEIGHT_PX +
  KIOSK_SHELL_HEADER_BORDER_PX +
  KIOSK_SHELL_SUBTITLE_HEIGHT_PX;

/** Available body height inside the logical canvas (subtitle visible). */
export const SCREEN2_BODY_HEIGHT_PX =
  KIOSK_LOGICAL_HEIGHT -
  SCREEN2_HEADER_STACK_WITH_SUBTITLE_PX -
  KIOSK_SHELL_FOOTER_HEIGHT_PX;

/** Inner body height after vertical padding. */
export const SCREEN2_BODY_INNER_HEIGHT_PX =
  SCREEN2_BODY_HEIGHT_PX - SCREEN2_BODY_PADDING_Y_PX * 2;

/** Center zone available height for rotating presentations. */
export const SCREEN2_CENTER_HEIGHT_PX = SCREEN2_BODY_INNER_HEIGHT_PX;

/** Canonical Anlageplan map aspect ratio (16:9). */
export const ANLAGEPLAN_MAP_ASPECT_RATIO = 16 / 9;

/**
 * Fit the Anlageplan map inside the center zone while preserving 16:9.
 * Width-constrained when the center is relatively tall; height-constrained
 * when the center is relatively wide.
 */
export function computeAnlageplanMapDimensions(
  centerWidthPx: number,
  centerHeightPx: number,
): { readonly widthPx: number; readonly heightPx: number } {
  const containerRatio = centerWidthPx / centerHeightPx;
  if (containerRatio > ANLAGEPLAN_MAP_ASPECT_RATIO) {
    const heightPx = centerHeightPx;
    return {
      widthPx: Math.round(heightPx * ANLAGEPLAN_MAP_ASPECT_RATIO),
      heightPx,
    };
  }

  const widthPx = centerWidthPx;
  return {
    widthPx,
    heightPx: Math.round(widthPx / ANLAGEPLAN_MAP_ASPECT_RATIO),
  };
}

/** Expected Anlageplan map dimensions at the logical 1920×1080 canvas. */
export const SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS = computeAnlageplanMapDimensions(
  SCREEN2_CENTER_WIDTH_PX,
  SCREEN2_CENTER_HEIGHT_PX,
);

/**
 * @deprecated Compact ÖV strip removed in R21; retained for legacy compact slide tests.
 */
export const SCREEN2_TRANSPORT_PANEL_HEIGHT_PX = Math.round(
  SCREEN2_CENTER_HEIGHT_PX * 0.28,
);

/** @deprecated Compact ÖV strip removed in R21. */
export const SCREEN2_LOWER_SPONSOR_ZONE_HEIGHT_PX = SCREEN2_TRANSPORT_PANEL_HEIGHT_PX;

/** Gap between compact departure rows. */
export const SCREEN2_TRANSPORT_COMPACT_ROW_GAP_PX = 3;

/** Departures rendered per physical direction column (R23 five-departure policy). */
export const SCREEN2_TRANSPORT_COMPACT_ROWS_PER_DIRECTION = 5;

/** Full-screen ÖV slide — departures per direction panel. */
export const SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION = 5;

/** R23R2 — gap between full-screen departure rows in each direction panel. */
export const SCREEN2_TRANSPORT_FULL_ROW_GAP_PX = 10;

/**
 * R23R2 — minimum full-screen row height (above the R23R1 52–68px band).
 */
export const SCREEN2_TRANSPORT_FULL_ROW_MIN_HEIGHT_PX = 72;

/**
 * R23R2 — upper bound for a single row when a direction has only one to three departures.
 */
export const SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX = 156;

/** CSS custom property set on direction row stacks for equal vertical distribution. */
export const SCREEN2_TRANSPORT_DIRECTION_ROW_COUNT_VAR =
  "--screen2-transport-direction-row-count";

/** CSS custom property — sparse-row max height cap (1–3 departures). */
export const SCREEN2_TRANSPORT_SPARSE_ROW_MAX_VAR = "--screen2-transport-sparse-row-max";

/** CSS custom property — full-screen row gap. */
export const SCREEN2_TRANSPORT_FULL_ROW_GAP_VAR = "--screen2-transport-full-row-gap";

const SCREEN2_TRANSPORT_COMPACT_PANEL_CHROME_PX = 42;

/** Fixed departure row height in the compact ÖV panel (1920×1080 contract). */
export const SCREEN2_TRANSPORT_COMPACT_ROW_HEIGHT_PX = Math.max(
  28,
  Math.floor(
    (SCREEN2_TRANSPORT_PANEL_HEIGHT_PX -
      SCREEN2_TRANSPORT_COMPACT_PANEL_CHROME_PX -
      SCREEN2_TRANSPORT_COMPACT_ROW_GAP_PX * (SCREEN2_TRANSPORT_COMPACT_ROWS_PER_DIRECTION - 1)) /
      SCREEN2_TRANSPORT_COMPACT_ROWS_PER_DIRECTION,
  ),
);

export const SCREEN2_BODY_SHELL_CSS_VARS = {
  "--screen2-body-padding-x": `${SCREEN2_BODY_PADDING_X_PX}px`,
  "--screen2-body-padding-y": `${SCREEN2_BODY_PADDING_Y_PX}px`,
  "--screen2-body-column-gap": `${SCREEN2_BODY_COLUMN_GAP_PX}px`,
  "--screen2-body-height": `${SCREEN2_BODY_HEIGHT_PX}px`,
  "--screen2-sponsor-rail-width": `${SCREEN2_SPONSOR_RAIL_WIDTH_PX}px`,
  "--screen2-center-width": `${SCREEN2_CENTER_WIDTH_PX}px`,
  "--screen2-transport-panel-height": `${SCREEN2_TRANSPORT_PANEL_HEIGHT_PX}px`,
  "--screen2-transport-row-height": `${SCREEN2_TRANSPORT_COMPACT_ROW_HEIGHT_PX}px`,
  "--screen2-transport-row-gap": `${SCREEN2_TRANSPORT_COMPACT_ROW_GAP_PX}px`,
  [SCREEN2_TRANSPORT_SPARSE_ROW_MAX_VAR]: `${SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX}px`,
  [SCREEN2_TRANSPORT_FULL_ROW_GAP_VAR]: `${SCREEN2_TRANSPORT_FULL_ROW_GAP_PX}px`,
} as const satisfies Record<string, string>;

export type Screen2BodyShellMeasurementContract = {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly bodyHeightPx: number;
  readonly bodyInnerHeightPx: number;
  readonly leftRailWidthPx: number;
  readonly centerWidthPx: number;
  readonly rightRailWidthPx: number;
  readonly columnGapPx: number;
  readonly bodyPaddingXPx: number;
  readonly bodyPaddingYPx: number;
  readonly centerHeightPx: number;
  readonly anlageplanMapWidthPx: number;
  readonly anlageplanMapHeightPx: number;
};

export const SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT: Screen2BodyShellMeasurementContract =
  {
    canvasWidth: KIOSK_LOGICAL_WIDTH,
    canvasHeight: KIOSK_LOGICAL_HEIGHT,
    bodyHeightPx: SCREEN2_BODY_HEIGHT_PX,
    bodyInnerHeightPx: SCREEN2_BODY_INNER_HEIGHT_PX,
    leftRailWidthPx: SCREEN2_SPONSOR_RAIL_WIDTH_PX,
    centerWidthPx: SCREEN2_CENTER_WIDTH_PX,
    rightRailWidthPx: SCREEN2_RIGHT_SPONSOR_RAIL_WIDTH_PX,
    columnGapPx: SCREEN2_BODY_COLUMN_GAP_PX,
    bodyPaddingXPx: SCREEN2_BODY_PADDING_X_PX,
    bodyPaddingYPx: SCREEN2_BODY_PADDING_Y_PX,
    centerHeightPx: SCREEN2_CENTER_HEIGHT_PX,
    anlageplanMapWidthPx: SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS.widthPx,
    anlageplanMapHeightPx: SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS.heightPx,
  };
