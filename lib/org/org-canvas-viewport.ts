/**
 * Viewport math for Organisation Builder canvas (fit, legibility, contextual zoom).
 */

import type { CSSProperties } from "react";
import {
  ORG_HIERARCHY_NODE_HEIGHT,
  ORG_HIERARCHY_NODE_WIDTH,
} from "@/lib/org/org-hierarchy-layout";

export const ORG_CANVAS_DEFAULT_NODE_WIDTH = ORG_HIERARCHY_NODE_WIDTH;
export const ORG_CANVAS_DEFAULT_NODE_HEIGHT = ORG_HIERARCHY_NODE_HEIGHT;
export const ORG_CANVAS_MIN_SCALE = 0.45;
export const ORG_CANVAS_MAX_SCALE = 1.75;
/** Minimum on-screen node width when prioritising readable default framing (px). */
export const ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH = 168;
/** Organisation name font size on cards at 1× canvas scale (px). */
export const ORG_CANVAS_NODE_NAME_FONT_PX = 14;
/** Target minimum rendered organisation name size in the default framing (px). */
export const ORG_CANVAS_LEGIBLE_MIN_NAME_PX = 14;

export type OrgCanvasChromeInsets = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type OrgCanvasFitMode = "initial" | "fitAll";

export type OrgContextualZoomLevel = "NORMAL" | "COMPACT" | "MICRO";

export function getOrgContextualZoomLevel(scale: number): OrgContextualZoomLevel {
  if (scale < 0.52) return "MICRO";
  if (scale < 0.82) return "COMPACT";
  return "NORMAL";
}

export type FitToViewInput = {
  viewportWidth: number;
  viewportHeight: number;
  layoutWidth: number;
  layoutHeight: number;
  /** When set, fit uses content box instead of layoutWidth/Height (0,0 origin). */
  boundsMinX?: number;
  boundsMinY?: number;
  contentWidth?: number;
  contentHeight?: number;
  chromeInsets?: OrgCanvasChromeInsets;
  nodeWidth?: number;
  padding?: number;
  minScale?: number;
  maxScale?: number;
  legibleMinScreenNodeWidth?: number;
  legibleMinNamePx?: number;
  nodeNameFontPx?: number;
  /** initial = readable default framing; fitAll = show every visible node (may shrink). */
  mode?: OrgCanvasFitMode;
};

export type FitToViewResult = {
  scale: number;
  panX: number;
  panY: number;
  /** True when legibility guard prevented shrinking below readable size. */
  legibilityClamped: boolean;
  /** True when hierarchy cannot fully fit at the chosen scale. */
  hierarchyOverflowsViewport: boolean;
};

export function computeOrgCanvasFitToView(input: FitToViewInput): FitToViewResult {
  const {
    viewportWidth: vw,
    viewportHeight: vh,
    layoutWidth,
    layoutHeight,
    boundsMinX = 0,
    boundsMinY = 0,
    contentWidth,
    contentHeight,
    chromeInsets = {},
    nodeWidth = ORG_CANVAS_DEFAULT_NODE_WIDTH,
    padding = 40,
    minScale = ORG_CANVAS_MIN_SCALE,
    maxScale = ORG_CANVAS_MAX_SCALE,
    legibleMinScreenNodeWidth = ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
    legibleMinNamePx = ORG_CANVAS_LEGIBLE_MIN_NAME_PX,
    nodeNameFontPx = ORG_CANVAS_NODE_NAME_FONT_PX,
    mode = "fitAll",
  } = input;

  const cw = contentWidth ?? layoutWidth;
  const ch = contentHeight ?? layoutHeight;
  const insetTop = chromeInsets.top ?? 0;
  const insetRight = chromeInsets.right ?? 0;
  const insetBottom = chromeInsets.bottom ?? 0;
  const insetLeft = chromeInsets.left ?? 0;

  const innerVw = vw - insetLeft - insetRight;
  const innerVh = vh - insetTop - insetBottom;

  if (cw <= 0 || ch <= 0 || innerVw <= 0 || innerVh <= 0) {
    return {
      scale: 1,
      panX: padding + insetLeft,
      panY: padding + insetTop,
      legibilityClamped: false,
      hierarchyOverflowsViewport: false,
    };
  }

  const scaleToFitWidth = (innerVw - padding * 2) / cw;
  const scaleToFitHeight = (innerVh - padding * 2) / ch;
  const fitScaleBoth = Math.min(scaleToFitWidth, scaleToFitHeight, maxScale);

  let scale: number;
  let legibilityClamped = false;

  if (mode === "fitAll") {
    scale = fitScaleBoth;
  } else {
    const legibleByNode = legibleMinScreenNodeWidth / nodeWidth;
    const legibleByName = legibleMinNamePx / nodeNameFontPx;
    const readableFloor = Math.max(legibleByNode, legibleByName);

    const widthLimitsBelowReadable =
      scaleToFitWidth <= scaleToFitHeight + 0.0001 && scaleToFitWidth < readableFloor - 0.001;

    if (fitScaleBoth >= readableFloor - 0.001) {
      scale = fitScaleBoth;
    } else if (widthLimitsBelowReadable) {
      scale = Math.min(maxScale, readableFloor);
      legibilityClamped = true;
    } else {
      scale = Math.max(readableFloor, Math.min(scaleToFitHeight, maxScale));
      legibilityClamped = scale > fitScaleBoth + 0.001;
    }
  }

  if (mode === "fitAll") {
    scale = Math.max(0.08, Math.min(maxScale, scale));
  } else {
    scale = Math.max(minScale, Math.min(maxScale, scale));
  }

  const hierarchyOverflowsViewport =
    cw * scale > innerVw - padding * 2 + 0.5 || ch * scale > innerVh - padding * 2 + 0.5;

  const panX = insetLeft + padding + (innerVw - padding * 2 - cw * scale) / 2 - boundsMinX * scale;

  const panY =
    mode === "initial"
      ? insetTop + padding - boundsMinY * scale
      : insetTop + padding + (innerVh - padding * 2 - ch * scale) / 2 - boundsMinY * scale;

  return { scale, panX, panY, legibilityClamped, hierarchyOverflowsViewport };
}

export function clampOrgCanvasScale(scale: number): number {
  return Math.max(ORG_CANVAS_MIN_SCALE, Math.min(ORG_CANVAS_MAX_SCALE, scale));
}

/** Minimum scale so organisation names render at the legibility target. */
export function orgCanvasReadableMinScale(
  legibleMinNamePx = ORG_CANVAS_LEGIBLE_MIN_NAME_PX,
  nodeNameFontPx = ORG_CANVAS_NODE_NAME_FONT_PX,
): number {
  return legibleMinNamePx / nodeNameFontPx;
}

/** Grid background position aligned to pan/zoom (design-tool style). */
export function orgCanvasGridBackgroundStyle(
  panX: number,
  panY: number,
  scale: number,
  gridStep = 24,
): CSSProperties {
  const step = gridStep * scale;
  const offsetX = ((panX % step) + step) % step;
  const offsetY = ((panY % step) + step) % step;
  return {
    backgroundImage:
      "radial-gradient(circle, color-mix(in srgb, var(--text-1) 7%, transparent) 1px, transparent 1px)",
    backgroundSize: `${step}px ${step}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
  };
}