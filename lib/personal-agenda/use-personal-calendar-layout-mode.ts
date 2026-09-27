"use client";

import { useSyncExternalStore } from "react";
import {
  PERSONAL_CALENDAR_LAYOUT_SERVER_VIEWPORT_PX,
  resolvePersonalCalendarLayoutMode,
  type PersonalCalendarLayoutMode,
} from "./personal-calendar-layout-mode";

function subscribeViewport(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getViewportWidthSnapshot(): number {
  return window.innerWidth;
}

function getViewportWidthServerSnapshot(): number {
  return PERSONAL_CALENDAR_LAYOUT_SERVER_VIEWPORT_PX;
}

/** Hydration-safe responsive layout mode for the personal month workspace. */
export function usePersonalCalendarLayoutMode(): PersonalCalendarLayoutMode {
  const viewportWidth = useSyncExternalStore(
    subscribeViewport,
    getViewportWidthSnapshot,
    getViewportWidthServerSnapshot,
  );
  return resolvePersonalCalendarLayoutMode(viewportWidth);
}
