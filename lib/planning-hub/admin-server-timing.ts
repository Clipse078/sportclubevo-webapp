/**
 * SCE-PERF-01 — optional server-side admin route data-path timings (one request).
 * Enable with SCE_PERF_TIMING=1 (or legacy PLANNER_PERF_TIMING=1) in the server environment.
 */

export type AdminServerTimingEntry = {
  label: string;
  durationMs: number;
};

export type AdminServerTimingReport = {
  route?: string;
  entries: AdminServerTimingEntry[];
  totalMs: number;
};

export function isScePerfTimingEnabled(): boolean {
  return process.env.SCE_PERF_TIMING === "1" || process.env.PLANNER_PERF_TIMING === "1";
}

export function createAdminServerTimer(route?: string): {
  mark: (label: string) => void;
  finish: () => AdminServerTimingReport;
} {
  const startedAt = performance.now();
  const entries: AdminServerTimingEntry[] = [];
  let lastMark = startedAt;

  return {
    mark(label: string) {
      const now = performance.now();
      entries.push({ label, durationMs: now - lastMark });
      lastMark = now;
    },
    finish() {
      const totalMs = performance.now() - startedAt;
      return { route, entries, totalMs };
    },
  };
}

export function logAdminServerTiming(report: AdminServerTimingReport): void {
  if (!isScePerfTimingEnabled()) return;
  const prefix = report.route ? `[sce-perf:${report.route}]` : "[sce-perf]";
  for (const entry of report.entries) {
    console.info(`${prefix} ${entry.label}: ${entry.durationMs.toFixed(1)}ms`);
  }
  console.info(`${prefix} TOTAL: ${report.totalMs.toFixed(1)}ms`);
}
