/**
 * PLANNING-HUB-02D — clip activity geometry to a visible time window (presentation only).
 */

import type { VisibleTimeRange } from "./time-scale";

export type ClippedActivityWindow = {
  visibleStartMinutes: number;
  visibleEndMinutes: number;
  continuesFromBefore: boolean;
  continuesAfter: boolean;
};

export function intervalIntersectsVisibleWindow(
  startMinutes: number,
  endMinutes: number,
  window: VisibleTimeRange,
): boolean {
  return startMinutes < window.endMinutes && endMinutes > window.startMinutes;
}

export function clipActivityToVisibleWindow(
  startMinutes: number,
  endMinutes: number,
  window: VisibleTimeRange,
): ClippedActivityWindow | null {
  if (!intervalIntersectsVisibleWindow(startMinutes, endMinutes, window)) {
    return null;
  }
  const visibleStartMinutes = Math.max(startMinutes, window.startMinutes);
  const visibleEndMinutes = Math.min(endMinutes, window.endMinutes);
  if (visibleEndMinutes <= visibleStartMinutes) return null;
  return {
    visibleStartMinutes,
    visibleEndMinutes,
    continuesFromBefore: startMinutes < window.startMinutes,
    continuesAfter: endMinutes > window.endMinutes,
  };
}

export function calendarTopPxForClippedActivity(
  visibleStartMinutes: number,
  window: VisibleTimeRange,
  pixelsPerMinute: number,
): number {
  return (visibleStartMinutes - window.startMinutes) * pixelsPerMinute;
}

export function calendarHeightPxForClippedActivity(
  visibleStartMinutes: number,
  visibleEndMinutes: number,
  pixelsPerMinute: number,
): number {
  return Math.max(12, (visibleEndMinutes - visibleStartMinutes) * pixelsPerMinute);
}
