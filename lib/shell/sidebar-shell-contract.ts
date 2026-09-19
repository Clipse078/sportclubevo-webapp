/**
 * SCE responsive shell geometry — mirrors app/globals.css sidebar tokens (SCE-RESPONSIVE-01L).
 *
 * Authoritative runtime values come from computed CSS custom properties on html.
 * This module provides the same contract for tests and overlay geometry math.
 */

import {
  resolveEffectiveSidebarWidthPx,
  SCE_MOBILE_SHELL_MAX_WIDTH_PX,
  SIDEBAR_COLLAPSED_WIDTH_PX,
  type ShellLayoutSnapshot,
} from "@/lib/shell/shell-layout-vars";

export type SidebarShellMode = "mobile-off-canvas" | "collapsed" | "expanded";

export function resolveSidebarShellMode(
  snapshot: ShellLayoutSnapshot,
): SidebarShellMode {
  if (snapshot.viewportWidthPx <= SCE_MOBILE_SHELL_MAX_WIDTH_PX) {
    return "mobile-off-canvas";
  }
  if (snapshot.collapsed) {
    return "collapsed";
  }
  return "expanded";
}

/** Persistent sidebar width occupying horizontal space (modal inset + shell). */
export function resolvePersistentSidebarWidthPx(
  snapshot: ShellLayoutSnapshot,
): number {
  return resolveEffectiveSidebarWidthPx(snapshot);
}

export function resolveModalApplicationLeftInsetPx(
  snapshot: ShellLayoutSnapshot,
): number {
  return resolvePersistentSidebarWidthPx(snapshot);
}

export const SCE_SHELL_CONTRACT_VIEWPORTS_PX = [
  390,
  768,
  769,
  1024,
  1180,
  1280,
  1366,
  1440,
  1536,
  1680,
  1920,
] as const;

export function readComputedShellInsetsFromDocument(): {
  effectiveSidebarWidthPx: number;
  sidebarWidthTokenPx: number;
  collapsed: boolean;
  viewportWidthPx: number;
} | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;

  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const effectiveSidebarWidthPx =
    parseCssPx(styles.getPropertyValue("--sce-sidebar-effective-width")) ?? 0;
  const sidebarWidthTokenPx = parseCssPx(styles.getPropertyValue("--sidebar-width")) ?? 0;
  const collapsed = root.dataset.sidebarCollapsed === "1";

  return {
    effectiveSidebarWidthPx,
    sidebarWidthTokenPx,
    collapsed,
    viewportWidthPx: window.innerWidth,
  };
}

function parseCssPx(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^([\d.]+)px$/.exec(trimmed);
  if (!match) return null;
  const n = Number.parseFloat(match[1]!);
  return Number.isFinite(n) ? n : null;
}

export { SIDEBAR_COLLAPSED_WIDTH_PX, SCE_MOBILE_SHELL_MAX_WIDTH_PX };
