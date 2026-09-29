/**
 * Summarize alternating baseline/feature jsonl from run-sce-perf-02b1-comparative.sh
 */
import { readFileSync } from "node:fs";
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function summarizeLatency(label: string, samples: number[]) {
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

type Row = { impl?: string; durationMs?: number; weekParam?: string };

function main() {
  const path = process.argv[2];
  if (!path) throw new Error("usage: summarize-comparative.ts <jsonl>");
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const byImpl: Record<string, number[]> = { baseline: [], feature: [] };
  let weekParam = "";
  for (const line of lines) {
    const row = JSON.parse(line) as Row;
    if (row.impl && typeof row.durationMs === "number") {
      byImpl[row.impl] = byImpl[row.impl] ?? [];
      byImpl[row.impl]!.push(row.durationMs);
      weekParam = row.weekParam ?? weekParam;
    }
  }
  const baseline = summarizeLatency(`baseline_${weekParam}`, byImpl.baseline ?? []);
  const feature = summarizeLatency(`feature_${weekParam}`, byImpl.feature ?? []);
  const diff = (a: number, b: number) => Number((b - a).toFixed(1));
  const pct = (a: number, b: number) => (a === 0 ? null : Number((((b - a) / a) * 100).toFixed(1)));

  const report = {
    weekParam,
    artifact: path,
    baseline,
    feature,
    deltaMs: {
      p50: diff(baseline.p50Ms, feature.p50Ms),
      p75: diff(baseline.p75Ms, feature.p75Ms),
      p95: diff(baseline.p95Ms, feature.p95Ms),
    },
    deltaPct: {
      p50: pct(baseline.p50Ms, feature.p50Ms),
      p75: pct(baseline.p75Ms, feature.p75Ms),
      p95: pct(baseline.p95Ms, feature.p95Ms),
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
