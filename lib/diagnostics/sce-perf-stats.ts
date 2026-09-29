/**
 * SCE-PERF-02A — small-sample latency summaries for diagnostic scripts.
 */

export type LatencySummary = {
  label: string;
  n: number;
  minMs: number;
  p50Ms: number;
  p75Ms: number;
  p95Ms: number;
  maxMs: number;
};

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, idx)]!;
}

export function summarizeLatency(
  label: string,
  samples: number[],
): LatencySummary {
  const sorted = [...samples].sort((a, b) => a - b);
  const round = (n: number) => Number(n.toFixed(1));
  return {
    label,
    n: samples.length,
    minMs: round(sorted[0]!),
    p50Ms: round(percentile(sorted, 50)),
    p75Ms: round(percentile(sorted, 75)),
    p95Ms: round(percentile(sorted, 95)),
    maxMs: round(sorted[sorted.length - 1]!),
  };
}
