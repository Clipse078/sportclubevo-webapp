export type TulipVisibleContentBoundsPx = {
  sourceWidthPx: number;
  sourceHeightPx: number;
  contentXPx: number;
  contentYPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
};

/**
 * Visible (non-transparent / non-white) bounds of `TULIP_DIGITAL_LOGO_PATH`,
 * computed once from the canonical PNG via the same scan as SWISS-01E4C2.
 * Kept as constants so PDF/email code never reads `public/` at build or request time.
 */
export const TULIP_DIGITAL_LOGO_VISIBLE_CONTENT_BOUNDS_PX: TulipVisibleContentBoundsPx =
  {
    sourceWidthPx: 1422,
    sourceHeightPx: 367,
    contentXPx: 12,
    contentYPx: 7,
    contentWidthPx: 1397,
    contentHeightPx: 346,
  };
