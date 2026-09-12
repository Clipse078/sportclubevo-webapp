/** PostScript points → millimetres. */
export const PT_TO_MM = 25.4 / 72;

/** Helvetica-like ascent/descent ratios (deterministic planning). */
const ASCENT_RATIO = 0.718;
const DESCENT_RATIO = 0.207;

export function fontAscentMm(sizePt: number): number {
  return sizePt * ASCENT_RATIO * PT_TO_MM;
}

export function fontDescentMm(sizePt: number): number {
  return sizePt * DESCENT_RATIO * PT_TO_MM;
}

export function inkExtentsFromBaselineMm(
  baselineYMm: number,
  sizePt: number,
): { topYMm: number; bottomYMm: number } {
  return {
    topYMm: baselineYMm - fontAscentMm(sizePt),
    bottomYMm: baselineYMm + fontDescentMm(sizePt),
  };
}

export function baselineForInkTopMm(inkTopYMm: number, sizePt: number): number {
  return inkTopYMm + fontAscentMm(sizePt);
}

export function gapBetweenInkMm(
  upperBottomYMm: number,
  lowerTopYMm: number,
): number {
  return lowerTopYMm - upperBottomYMm;
}
