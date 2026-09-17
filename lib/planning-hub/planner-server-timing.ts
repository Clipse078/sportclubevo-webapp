/**
 * SCE-EVENTS-01C / SCE-PERF-01 — planner route timing (delegates to admin-server-timing).
 */

import {
  createAdminServerTimer,
  isScePerfTimingEnabled,
  logAdminServerTiming,
  type AdminServerTimingReport,
} from "@/lib/planning-hub/admin-server-timing";

export type PlannerServerTimingEntry = AdminServerTimingReport["entries"][number];
export type PlannerServerTimingReport = AdminServerTimingReport;

export function isPlannerPerfTimingEnabled(): boolean {
  return isScePerfTimingEnabled();
}

export function createPlannerServerTimer() {
  return createAdminServerTimer("planner/week");
}

export function logPlannerServerTiming(report: PlannerServerTimingReport): void {
  logAdminServerTiming(report);
}
