/**
 * FIN-04E-07 — map business dates to normalized timeline coordinates (0–1).
 */

function utcDayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

export function timelinePositionFraction(input: {
  dateIso: string;
  windowStartDateIso: string;
  windowEndDateIso: string;
}): number {
  const start = utcDayMs(input.windowStartDateIso);
  const end = utcDayMs(input.windowEndDateIso);
  const value = utcDayMs(input.dateIso);
  if (end <= start) return 0.5;
  const raw = (value - start) / (end - start);
  return Math.max(0, Math.min(1, raw));
}

export function timelineSpanFractions(input: {
  startDateIso: string;
  endDateIso: string;
  windowStartDateIso: string;
  windowEndDateIso: string;
}): { left: number; width: number } {
  const left = timelinePositionFraction({
    dateIso: input.startDateIso,
    windowStartDateIso: input.windowStartDateIso,
    windowEndDateIso: input.windowEndDateIso,
  });
  const right = timelinePositionFraction({
    dateIso: input.endDateIso,
    windowStartDateIso: input.windowStartDateIso,
    windowEndDateIso: input.windowEndDateIso,
  });
  return {
    left,
    width: Math.max(0.008, right - left),
  };
}

/** Marker radius in SVG user units — bounded by materiality. */
export function timelineMarkerRadius(materialityFraction: number): number {
  const minR = 4;
  const maxR = 11;
  return minR + materialityFraction * (maxR - minR);
}
