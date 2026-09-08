/**
 * SCE-DASHBOARD-V3-03D — Dashboard hero cover image positioning math.
 *
 * Normalized focal coordinates (0..1) + zoom multiplier on cover scale.
 * No viewport-specific pixel offsets are persisted.
 */

export const HERO_MIN_ZOOM = 1;
export const HERO_MAX_ZOOM = 2.5;

export const DEFAULT_HERO_TRANSFORM: HeroImageTransform = {
  positionX: 0.5,
  positionY: 0.5,
  zoom: HERO_MIN_ZOOM,
};

export type HeroImageTransform = {
  /** Horizontal focal point — 0 = left edge aligned, 1 = right edge aligned. */
  positionX: number;
  /** Vertical focal point — 0 = top edge aligned, 1 = bottom edge aligned. */
  positionY: number;
  /** Zoom multiplier applied on top of object-cover minimum scale (>= 1). */
  zoom: number;
};

export type Size2D = {
  width: number;
  height: number;
};

export type PixelOffset = {
  x: number;
  y: number;
};

export type HeroRenderState = {
  scaledWidth: number;
  scaledHeight: number;
  offset: PixelOffset;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, HERO_MIN_ZOOM, HERO_MAX_ZOOM);
}

export function clampPosition(position: HeroImageTransform): HeroImageTransform {
  return {
    positionX: clamp01(position.positionX),
    positionY: clamp01(position.positionY),
    zoom: clampZoom(position.zoom),
  };
}

/** Minimum scale so the image fully covers the viewport (object-cover). */
export function getCoverScale(viewport: Size2D, image: Size2D): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.max(viewport.width / image.width, viewport.height / image.height);
}

export function getScaledDimensions(
  viewport: Size2D,
  image: Size2D,
  zoom: number,
): Size2D {
  const coverScale = getCoverScale(viewport, image);
  const scale = coverScale * clampZoom(zoom);
  return {
    width: image.width * scale,
    height: image.height * scale,
  };
}

/** Allowable offset range for a scaled image that must cover the viewport. */
export function getOffsetBounds(
  viewport: Size2D,
  scaled: Size2D,
): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: viewport.width - scaled.width,
    maxX: 0,
    minY: viewport.height - scaled.height,
    maxY: 0,
  };
}

export function clampOffset(
  viewport: Size2D,
  scaled: Size2D,
  offset: PixelOffset,
): PixelOffset {
  const bounds = getOffsetBounds(viewport, scaled);
  return {
    x: clamp(offset.x, bounds.minX, bounds.maxX),
    y: clamp(offset.y, bounds.minY, bounds.maxY),
  };
}

/** Convert normalized focal point to top-left pixel offset (CSS absolute positioning). */
export function positionToOffset(
  viewport: Size2D,
  image: Size2D,
  transform: HeroImageTransform,
): PixelOffset {
  const scaled = getScaledDimensions(viewport, image, transform.zoom);
  const raw = {
    x: (viewport.width - scaled.width) * transform.positionX,
    y: (viewport.height - scaled.height) * transform.positionY,
  };
  return clampOffset(viewport, scaled, raw);
}

/** Convert clamped pixel offset back to normalized focal coordinates. */
export function offsetToPosition(
  viewport: Size2D,
  image: Size2D,
  offset: PixelOffset,
  zoom: number,
): Pick<HeroImageTransform, "positionX" | "positionY"> {
  const scaled = getScaledDimensions(viewport, image, zoom);
  const clamped = clampOffset(viewport, scaled, offset);

  const denomX = viewport.width - scaled.width;
  const denomY = viewport.height - scaled.height;

  const positionX = denomX === 0 ? 0.5 : clamped.x / denomX;
  const positionY = denomY === 0 ? 0.5 : clamped.y / denomY;

  return {
    positionX: clamp01(positionX),
    positionY: clamp01(positionY),
  };
}

export function getHeroRenderState(
  viewport: Size2D,
  image: Size2D,
  transform: HeroImageTransform,
): HeroRenderState {
  const clamped = clampPosition(transform);
  const scaled = getScaledDimensions(viewport, image, clamped.zoom);
  const offset = positionToOffset(viewport, image, clamped);
  return { scaledWidth: scaled.width, scaledHeight: scaled.height, offset };
}

/** True when the scaled image fails to cover the viewport (blank space would show). */
export function hasBlankSpace(
  viewport: Size2D,
  scaled: Size2D,
  offset: PixelOffset,
): boolean {
  if (scaled.width < viewport.width || scaled.height < viewport.height) return true;
  if (offset.x > 0 || offset.y > 0) return true;
  if (offset.x + scaled.width < viewport.width) return true;
  if (offset.y + scaled.height < viewport.height) return true;
  return false;
}

/**
 * Change zoom while keeping the image point under the viewport focal anchor fixed.
 * Default anchor is viewport center.
 */
export function applyZoomAtAnchor(
  viewport: Size2D,
  image: Size2D,
  transform: HeroImageTransform,
  nextZoom: number,
  anchor: PixelOffset = {
    x: viewport.width / 2,
    y: viewport.height / 2,
  },
): HeroImageTransform {
  const currentZoom = clampZoom(transform.zoom);
  const targetZoom = clampZoom(nextZoom);
  if (currentZoom === targetZoom) return clampPosition(transform);

  const currentScaled = getScaledDimensions(viewport, image, currentZoom);
  const currentOffset = positionToOffset(viewport, image, {
    ...transform,
    zoom: currentZoom,
  });

  const imageAnchorX =
    image.width * ((anchor.x - currentOffset.x) / currentScaled.width);
  const imageAnchorY =
    image.height * ((anchor.y - currentOffset.y) / currentScaled.height);

  const nextScaled = getScaledDimensions(viewport, image, targetZoom);
  const rawOffset = {
    x: anchor.x - (imageAnchorX / image.width) * nextScaled.width,
    y: anchor.y - (imageAnchorY / image.height) * nextScaled.height,
  };
  const nextOffset = clampOffset(viewport, nextScaled, rawOffset);
  const nextPosition = offsetToPosition(viewport, image, nextOffset, targetZoom);

  return clampPosition({
    positionX: nextPosition.positionX,
    positionY: nextPosition.positionY,
    zoom: targetZoom,
  });
}

export function applyPanDelta(
  viewport: Size2D,
  image: Size2D,
  transform: HeroImageTransform,
  delta: PixelOffset,
): HeroImageTransform {
  const scaled = getScaledDimensions(viewport, image, transform.zoom);
  const currentOffset = positionToOffset(viewport, image, transform);
  const nextOffset = clampOffset(viewport, scaled, {
    x: currentOffset.x + delta.x,
    y: currentOffset.y + delta.y,
  });
  const nextPosition = offsetToPosition(viewport, image, nextOffset, transform.zoom);

  return clampPosition({
    positionX: nextPosition.positionX,
    positionY: nextPosition.positionY,
    zoom: transform.zoom,
  });
}

const KEYBOARD_NUDGE = 0.02;
const KEYBOARD_NUDGE_LARGE = 0.08;

export type NudgeDirection = "left" | "right" | "up" | "down";

export function nudgePosition(
  transform: HeroImageTransform,
  direction: NudgeDirection,
  large = false,
): HeroImageTransform {
  const step = large ? KEYBOARD_NUDGE_LARGE : KEYBOARD_NUDGE;
  const next = { ...transform };

  switch (direction) {
    case "left":
      next.positionX -= step;
      break;
    case "right":
      next.positionX += step;
      break;
    case "up":
      next.positionY -= step;
      break;
    case "down":
      next.positionY += step;
      break;
  }

  return clampPosition(next);
}
