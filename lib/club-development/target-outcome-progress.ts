import "server-only";

import type { TargetDirection } from "@prisma/client";

export type TargetMetricProgressInput = {
  targetValue: number;
  currentValue: number;
  direction: TargetDirection;
};

/**
 * Outcome % for a single metric (0–100). Task / delivery progress must not be mixed in here.
 */
export function computeMetricOutcomePercent(metric: TargetMetricProgressInput): number | null {
  if (metric.targetValue === 0) return null;
  if (metric.direction === "DECREASE") {
    const start = metric.targetValue * 2;
    if (start <= 0) return null;
    const ratio = (start - metric.currentValue) / start;
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }
  if (metric.direction === "MAINTAIN") {
    const delta = Math.abs(metric.currentValue - metric.targetValue);
    const tolerance = Math.max(Math.abs(metric.targetValue), 1);
    const within = delta <= tolerance * 0.05;
    return within ? 100 : Math.max(0, Math.min(100, Math.round(100 - (delta / tolerance) * 100)));
  }
  return Math.max(
    0,
    Math.min(100, Math.round((metric.currentValue / metric.targetValue) * 100)),
  );
}

/**
 * Aggregated target outcome % — arithmetic mean of per-metric outcome percents.
 */
export function computeTargetOutcomePercent(metrics: TargetMetricProgressInput[]): number | null {
  if (metrics.length === 0) return null;
  const parts = metrics
    .map((m) => computeMetricOutcomePercent(m))
    .filter((p): p is number => p !== null);
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((sum, p) => sum + p, 0) / parts.length);
}
