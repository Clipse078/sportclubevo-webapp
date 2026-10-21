/**
 * Viewport math for Organisation Builder canvas (fit, legibility, contextual zoom).
 */

import type { CSSProperties } from "react";

export const ORG_CANVAS_DEFAULT_NODE_WIDTH = 200;
export const ORG_CANVAS_DEFAULT_NODE_HEIGHT = 68;
export const ORG_CANVAS_MIN_SCALE = 0.45;
export const ORG_CANVAS_MAX_SCALE = 1.75;
/** Minimum on-screen node width when using fit-to-view (px). */
export const ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH = 128;

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
    nodeWidth = ORG_CANVAS_DEFAULT_NODE_WIDTH,
    padding = 32,
    minScale = ORG_CANVAS_MIN_SCALE,
    maxScale = ORG_CANVAS_MAX_SCALE,
    legibleMinScreenNodeWidth = ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
  } = input;

  if (layoutWidth <= 0 || layoutHeight <= 0 || vw <= 0 || vh <= 0) {
    return {
      scale: 1,
      panX: padding,
      panY: padding,
      legibilityClamped: false,
      hierarchyOverflowsViewport: false,
    };
  }

  const fitScaleRaw = Math.min(
    (vw - padding * 2) / layoutWidth,
    (vh - padding * 2) / layoutHeight,
    1,
  );

  const legibleFloor = legibleMinScreenNodeWidth / nodeWidth;
  let scale = Math.max(fitScaleRaw, legibleFloor);
  const legibilityClamped = scale > fitScaleRaw + 0.001;
  scale = Math.max(minScale, Math.min(maxScale, scale));

  const hierarchyOverflowsViewport =
    layoutWidth * scale > vw - padding * 2 || layoutHeight * scale > vh - padding * 2;

  const panX = (vw - layoutWidth * scale) / 2;
  const panY = (vh - layoutHeight * scale) / 2;

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
      "radial-gradient(circle, color-mix(in srgb, var(--text-1) 14%, transparent) 1px, transparent 1px)",
    backgroundSize: `${step}px ${step}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
  };
}
