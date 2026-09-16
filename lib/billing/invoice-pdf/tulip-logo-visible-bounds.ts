import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TULIP_DIGITAL_LOGO_VISIBLE_CONTENT_BOUNDS_PX,
  type TulipVisibleContentBoundsPx,
} from "./tulip-logo-visible-bounds.constants";

export type { TulipVisibleContentBoundsPx };

/** PO target visible height on A4 (SWISS-01E4C3 optical balance with SCE). */
export const TULIP_VISIBLE_TARGET_HEIGHT_MM = 5.25;
export const TULIP_VISIBLE_MIN_HEIGHT_MM = 5;
export const TULIP_VISIBLE_MAX_HEIGHT_MM = 5.5;
/** @deprecated Width-led sizing rejected in 01E4C3 — use height target. */
export const TULIP_VISIBLE_TARGET_WIDTH_MM = 25;

const TULIP_VISIBLE_ARTWORK_FILE = "tulip-digital-visible-artwork.png";

function tulipVisibleArtworkAbsolutePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "assets",
    TULIP_VISIBLE_ARTWORK_FILE,
  );
}

/** Deterministic non-transparent / non-white artwork bounds (SWISS-01E4C2). */
export function readTulipVisibleContentBoundsPx(): TulipVisibleContentBoundsPx {
  return TULIP_DIGITAL_LOGO_VISIBLE_CONTENT_BOUNDS_PX;
}

export function tulipVisiblePaddingDetected(
  bounds = readTulipVisibleContentBoundsPx(),
): boolean {
  return (
    bounds.contentXPx > 0 ||
    bounds.contentYPx > 0 ||
    bounds.contentXPx + bounds.contentWidthPx < bounds.sourceWidthPx ||
    bounds.contentYPx + bounds.contentHeightPx < bounds.sourceHeightPx
  );
}

export function computeTulipVisibleDrawSizeMm(
  bounds = readTulipVisibleContentBoundsPx(),
  targetVisibleHeightMm = TULIP_VISIBLE_TARGET_HEIGHT_MM,
): { visibleWidthMm: number; visibleHeightMm: number; contentAspectRatio: number } {
  const contentAspectRatio = bounds.contentWidthPx / bounds.contentHeightPx;
  const visibleHeightMm = targetVisibleHeightMm;
  const visibleWidthMm = visibleHeightMm * contentAspectRatio;
  return { visibleWidthMm, visibleHeightMm, contentAspectRatio };
}

/** Cropped PNG bytes (visible artwork only) for PDF embed; source file unchanged. */
export function loadTulipVisibleArtworkPngBytes(): {
  pngBytes: Buffer;
  bounds: TulipVisibleContentBoundsPx;
} {
  const bounds = readTulipVisibleContentBoundsPx();
  const pngBytes = readFileSync(tulipVisibleArtworkAbsolutePath());
  return { pngBytes, bounds };
}

export function resetTulipVisibleBoundsCacheForTests(): void {
  // Bounds are static; kept for test compatibility.
}
