import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { TULIP_DIGITAL_LOGO_PATH } from "./constants";

export type TulipVisibleContentBoundsPx = {
  sourceWidthPx: number;
  sourceHeightPx: number;
  contentXPx: number;
  contentYPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
};

/** PO target visible height on A4 (SWISS-01E4C3 optical balance with SCE). */
export const TULIP_VISIBLE_TARGET_HEIGHT_MM = 5.25;
export const TULIP_VISIBLE_MIN_HEIGHT_MM = 5;
export const TULIP_VISIBLE_MAX_HEIGHT_MM = 5.5;
/** @deprecated Width-led sizing rejected in 01E4C3 — use height target. */
export const TULIP_VISIBLE_TARGET_WIDTH_MM = 25;

let cachedBounds: TulipVisibleContentBoundsPx | null = null;

function isMeaningfulPixel(r: number, g: number, b: number, a: number): boolean {
  if (a <= 10) {
    return false;
  }
  if (r > 240 && g > 240 && b > 240) {
    return false;
  }
  return true;
}

/** Deterministic non-transparent / non-white artwork bounds (SWISS-01E4C2). */
export function readTulipVisibleContentBoundsPx(
  absolutePath = path.join(process.cwd(), TULIP_DIGITAL_LOGO_PATH),
): TulipVisibleContentBoundsPx {
  if (cachedBounds) {
    return cachedBounds;
  }

  const png = PNG.sync.read(readFileSync(absolutePath));
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i]!;
      const g = png.data[i + 1]!;
      const b = png.data[i + 2]!;
      const a = png.data[i + 3]!;
      if (!isMeaningfulPixel(r, g, b, a)) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`Tulip logo has no visible content: ${absolutePath}`);
  }

  cachedBounds = {
    sourceWidthPx: png.width,
    sourceHeightPx: png.height,
    contentXPx: minX,
    contentYPx: minY,
    contentWidthPx: maxX - minX + 1,
    contentHeightPx: maxY - minY + 1,
  };
  return cachedBounds;
}

export function tulipVisiblePaddingDetected(bounds = readTulipVisibleContentBoundsPx()): boolean {
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
export function loadTulipVisibleArtworkPngBytes(
  absolutePath = path.join(process.cwd(), TULIP_DIGITAL_LOGO_PATH),
): { pngBytes: Buffer; bounds: TulipVisibleContentBoundsPx } {
  const bounds = readTulipVisibleContentBoundsPx(absolutePath);
  const source = PNG.sync.read(readFileSync(absolutePath));
  const cropped = new PNG({ width: bounds.contentWidthPx, height: bounds.contentHeightPx });

  for (let y = 0; y < bounds.contentHeightPx; y++) {
    for (let x = 0; x < bounds.contentWidthPx; x++) {
      const srcI = ((bounds.contentYPx + y) * source.width + (bounds.contentXPx + x)) * 4;
      const dstI = (y * bounds.contentWidthPx + x) * 4;
      cropped.data[dstI] = source.data[srcI]!;
      cropped.data[dstI + 1] = source.data[srcI + 1]!;
      cropped.data[dstI + 2] = source.data[srcI + 2]!;
      cropped.data[dstI + 3] = source.data[srcI + 3]!;
    }
  }

  return { pngBytes: PNG.sync.write(cropped), bounds };
}

export function resetTulipVisibleBoundsCacheForTests(): void {
  cachedBounds = null;
}
