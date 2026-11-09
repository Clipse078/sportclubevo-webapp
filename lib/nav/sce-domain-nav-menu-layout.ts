/**
 * SCE-DS2-05B-R10 — Cham mega-menu frame geometry.
 *
 * The overlay stays full-bleed and fixed. Its contents share one centered
 * max-width frame. Column tracks are fractions of that frame, not independent
 * viewport offsets. Overlay top still comes from the primary-row anchor.
 */

import { computeDomainNavOverlayGeometry } from "@/lib/nav/sce-domain-nav-overlay-geometry";

export const SCE_DOMAIN_NAV_CHECK_VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const REM_PX = 16;

export type DomainNavMenuTokens = {
  contentMaxPx: number;
  padInlineMinPx: number;
  padInlineVw: number;
  padInlineMaxPx: number;
  padBlockStartPx: number;
  padBlockEndPx: number;
  columnGapMinPx: number;
  columnGapVw: number;
  columnGapMaxPx: number;
  colTitle: number;
  colCategories: number;
  colDestinations: number;
  rowMinHeightPx: number;
};

export type DomainNavMenuLayout = {
  viewportWidth: number;
  viewportHeight: number;
  containerWidth: number;
  contentWidth: number;
  outerInset: number;
  padInline: number;
  columnGap: number;
  columns: { title: number; categories: number; destinations: number };
  freeShares: { title: number; categories: number; destinations: number };
  paddingBlockStart: number;
  paddingBlockEnd: number;
  horizontalOverflow: boolean;
  overlayTop: number;
  scrollportMaxHeight: number;
  bottomGap: number;
};

function readCustomProp(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!match?.[1]) {
    throw new Error(`Missing ${name}`);
  }
  return match[1].trim();
}

function remToPx(value: string): number {
  const match = value.trim().match(/^(\d*\.?\d+)rem$/);
  if (!match?.[1]) {
    throw new Error(`Expected rem, received ${value}`);
  }
  return Number(match[1]) * REM_PX;
}

function parseClamp(value: string): {
  minPx: number;
  vw: number;
  maxPx: number;
} {
  const match = value.match(
    /^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/,
  );
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Expected clamp(), received ${value}`);
  }
  const vw = match[2].trim().match(/^(\d*\.?\d+)vw$/);
  if (!vw?.[1]) {
    throw new Error(`Expected vw middle term, received ${match[2]}`);
  }
  return {
    minPx: remToPx(match[1]),
    vw: Number(vw[1]) / 100,
    maxPx: remToPx(match[3]),
  };
}

function clampPx(minPx: number, preferred: number, maxPx: number): number {
  return Math.min(maxPx, Math.max(minPx, preferred));
}

export function parseDomainNavMenuTokens(css: string): DomainNavMenuTokens {
  const padInline = parseClamp(
    readCustomProp(css, "--sce-domain-nav-frame-pad-inline"),
  );
  const columnGap = parseClamp(
    readCustomProp(css, "--sce-domain-nav-column-gap"),
  );
  return {
    contentMaxPx: remToPx(readCustomProp(css, "--sce-domain-nav-content-max")),
    padInlineMinPx: padInline.minPx,
    padInlineVw: padInline.vw,
    padInlineMaxPx: padInline.maxPx,
    padBlockStartPx: remToPx(
      readCustomProp(css, "--sce-domain-nav-frame-pad-block-start"),
    ),
    padBlockEndPx: remToPx(
      readCustomProp(css, "--sce-domain-nav-frame-pad-block-end"),
    ),
    columnGapMinPx: columnGap.minPx,
    columnGapVw: columnGap.vw,
    columnGapMaxPx: columnGap.maxPx,
    colTitle: Number(readCustomProp(css, "--sce-domain-nav-col-title")),
    colCategories: Number(
      readCustomProp(css, "--sce-domain-nav-col-categories"),
    ),
    colDestinations: Number(
      readCustomProp(css, "--sce-domain-nav-col-destinations"),
    ),
    rowMinHeightPx: remToPx(
      readCustomProp(css, "--sce-domain-nav-row-min-height"),
    ),
  };
}

export function computeDomainNavMenuLayout(
  tokens: DomainNavMenuTokens,
  viewportWidth: number,
  viewportHeight: number,
  anchorBottom = 54,
): DomainNavMenuLayout {
  const padInline = clampPx(
    tokens.padInlineMinPx,
    viewportWidth * tokens.padInlineVw,
    tokens.padInlineMaxPx,
  );
  const columnGap = clampPx(
    tokens.columnGapMinPx,
    viewportWidth * tokens.columnGapVw,
    tokens.columnGapMaxPx,
  );
  const containerWidth = Math.min(viewportWidth, tokens.contentMaxPx);
  const contentWidth = containerWidth - padInline * 2;
  const outerInset = (viewportWidth - containerWidth) / 2 + padInline;
  const free = contentWidth - columnGap * 2;
  const total = tokens.colTitle + tokens.colCategories + tokens.colDestinations;
  const title = (free * tokens.colTitle) / total;
  const categories = (free * tokens.colCategories) / total;
  const destinations = (free * tokens.colDestinations) / total;
  const overlay = computeDomainNavOverlayGeometry(anchorBottom, viewportHeight);

  return {
    viewportWidth,
    viewportHeight,
    containerWidth,
    contentWidth,
    outerInset,
    padInline,
    columnGap,
    columns: { title, categories, destinations },
    freeShares: {
      title: title / free,
      categories: categories / free,
      destinations: destinations / free,
    },
    paddingBlockStart: tokens.padBlockStartPx,
    paddingBlockEnd: tokens.padBlockEndPx,
    horizontalOverflow:
      containerWidth - viewportWidth > 0.5 || contentWidth <= 0 || free <= 0,
    overlayTop: overlay.top,
    scrollportMaxHeight: overlay.maxHeight,
    bottomGap: viewportHeight - overlay.top - overlay.maxHeight,
  };
}
