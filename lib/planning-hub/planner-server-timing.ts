/**
 * SCE-EVENTS-01C — optional server-side planner data-path timings (one request).
 * Enable with PLANNER_PERF_TIMING=1 in the server environment.
 */

export type PlannerServerTimingEntry = {
  label: string;
  durationMs: number;
};

export type PlannerServerTimingReport = {
  entries: PlannerServerTimingEntry[];
  totalMs: number;
};

export function isPlannerPerfTimingEnabled(): boolean {
  return process.env.PLANNER_PERF_TIMING === "1";
}

export function createPlannerServerTimer(): {
  mark: (label: string) => void;
  finish: () => PlannerServerTimingReport;
} {
  const startedAt = performance.now();
  const entries: PlannerServerTimingEntry[] = [];
  let lastMark = startedAt;

  return {
    mark(label: string) {
      const now = performance.now();
      entries.push({ label, durationMs: now - lastMark });
      lastMark = now;
    },
    finish() {
      const totalMs = performance.now() - startedAt;
      return { entries, totalMs };
    },
  };
}

export function logPlannerServerTiming(report: PlannerServerTimingReport): void {
  if (!isPlannerPerfTimingEnabled()) return;
  for (const entry of report.entries) {
    console.info(`[planner-perf] ${entry.label}: ${entry.durationMs.toFixed(1)}ms`);
  }
  console.info(`[planner-perf] TOTAL: ${report.totalMs.toFixed(1)}ms`);
}
