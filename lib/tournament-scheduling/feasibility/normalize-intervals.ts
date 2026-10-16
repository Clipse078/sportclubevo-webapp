import type { FeasibilityExternalOccupancyInterval, FeasibilityInstantWindow } from "./types";

function sortWindows(windows: FeasibilityInstantWindow[]): FeasibilityInstantWindow[] {
  return [...windows].sort((a, b) => a.startUtcMs - b.startUtcMs);
}

/**
 * Subtract blocking intervals from a base window (deterministic, minute-precise instants).
 */
export function subtractOccupancyFromWindow(
  base: FeasibilityInstantWindow,
  blocks: readonly FeasibilityExternalOccupancyInterval[],
): FeasibilityInstantWindow[] {
  const relevant = blocks
    .filter((b) => b.endUtcMs > base.startUtcMs && b.startUtcMs < base.endUtcMs)
    .sort((a, b) => a.startUtcMs - b.startUtcMs);

  let segments: FeasibilityInstantWindow[] = [base];
  for (const block of relevant) {
    const next: FeasibilityInstantWindow[] = [];
    for (const segment of segments) {
      if (block.endUtcMs <= segment.startUtcMs || block.startUtcMs >= segment.endUtcMs) {
        next.push(segment);
        continue;
      }
      if (block.startUtcMs > segment.startUtcMs) {
        next.push({ startUtcMs: segment.startUtcMs, endUtcMs: block.startUtcMs });
      }
      if (block.endUtcMs < segment.endUtcMs) {
        next.push({ startUtcMs: block.endUtcMs, endUtcMs: segment.endUtcMs });
      }
    }
    segments = next;
  }
  return sortWindows(segments.filter((s) => s.endUtcMs > s.startUtcMs));
}

export function intersectWindow(
  a: FeasibilityInstantWindow,
  b: FeasibilityInstantWindow,
): FeasibilityInstantWindow | null {
  const startUtcMs = Math.max(a.startUtcMs, b.startUtcMs);
  const endUtcMs = Math.min(a.endUtcMs, b.endUtcMs);
  if (endUtcMs <= startUtcMs) return null;
  return { startUtcMs, endUtcMs };
}
