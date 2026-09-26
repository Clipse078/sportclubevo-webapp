"use client";

import { useSyncExternalStore } from "react";
import {
  resolvePersonalCalendarDayVisibleBlockLimit,
  resolvePersonalCalendarDayVisibleBlockLimitForViewport,
} from "./personal-calendar-day-capacity";

function subscribeViewport(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getViewportWidthSnapshot(): number {
  return window.innerWidth;
}

function getViewportWidthServerSnapshot(): number {
  return 1280;
}

/**
 * Hydration-safe viewport-aware day block cap for the month workspace.
 */
export function usePersonalCalendarDayVisibleBlockLimit(weekRowCount: number): number {
  const viewportWidth = useSyncExternalStore(
    subscribeViewport,
    getViewportWidthSnapshot,
    getViewportWidthServerSnapshot,
  );
  return resolvePersonalCalendarDayVisibleBlockLimitForViewport(weekRowCount, viewportWidth);
}

export { resolvePersonalCalendarDayVisibleBlockLimit };
