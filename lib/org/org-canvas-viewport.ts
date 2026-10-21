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
/** Minimum on-screen node width when using fit-to-view (px). */
export const ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH = 152;

export type OrgCanvasChromeInsets = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type OrgContextualZoomLevel = "NORMAL" | "COMPACT" | "MICRO";

export function getOrgContextualZoomLevel(scale: number): OrgContextualZoomLevel {
  if (scale < 0.52) return "MICRO";
  if (scale < 0.78) return "COMPACT";
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
};

export type FitToViewResult = {
  scale: number;
  panX: number;
  panY: number;
  /** True when legibility guard prevented shrinking below readable node size. */
  legibilityClamped: boolean;
  /** True when hierarchy cannot fully fit at legible scale. */
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

  const fitScaleRaw = Math.min(
    (innerVw - padding * 2) / cw,
    (innerVh - padding * 2) / ch,
    1,
  );

  const legibleFloor = legibleMinScreenNodeWidth / nodeWidth;
  let scale = Math.max(fitScaleRaw, legibleFloor);
  const legibilityClamped = scale > fitScaleRaw + 0.001;
  scale = Math.max(minScale, Math.min(maxScale, scale));

  const hierarchyOverflowsViewport =
    cw * scale > innerVw - padding * 2 || ch * scale > innerVh - padding * 2;

  const panX = insetLeft + padding + (innerVw - padding * 2 - cw * scale) / 2 - boundsMinX * scale;
  const panY = insetTop + padding + (innerVh - padding * 2 - ch * scale) / 2 - boundsMinY * scale;

  return { scale, panX, panY, legibilityClamped, hierarchyOverflowsViewport };
}

export function clampOrgCanvasScale(scale: number): number {
  return Math.max(ORG_CANVAS_MIN_SCALE, Math.min(ORG_CANVAS_MAX_SCALE, scale));
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
