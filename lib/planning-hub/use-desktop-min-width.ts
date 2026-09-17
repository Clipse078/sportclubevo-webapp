"use client";

import { useSyncExternalStore } from "react";

export const PLANNING_HUB_DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function subscribeDesktop(callback: () => void): () => void {
  const mq = window.matchMedia(PLANNING_HUB_DESKTOP_MEDIA_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(PLANNING_HUB_DESKTOP_MEDIA_QUERY).matches;
}

/** SSR snapshot assumes desktop so hydration can enable manipulation after mount. */
function getDesktopServerSnapshot(): boolean {
  return true;
}

export function useDesktopMinWidth768(): boolean {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getDesktopServerSnapshot);
}
