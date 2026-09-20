import { SERIES_ASSIGNMENT_NOTIFICATION_HORIZON_MS } from "./constants";

/**
 * V1 storm protection: generated series occurrences only emit immediate
 * assignment notifications when due within the actionable horizon.
 */
export function shouldEmitSeriesAssignmentNotification(
  dueAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueAt) {
    return true;
  }
  const deltaMs = dueAt.getTime() - now.getTime();
  return deltaMs <= SERIES_ASSIGNMENT_NOTIFICATION_HORIZON_MS;
}
