/**
 * SCE-RESPONSIVE-01L — document-level shell layout variables for portalled overlays.
 *
 * JS sets only the persisted desktop sidebar width token (--sidebar-width).
 * --sce-sidebar-effective-width is derived in CSS (collapsed + mobile breakpoints).
 */

import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

/** Matches --sidebar-collapsed-width in app/globals.css */
export const SIDEBAR_COLLAPSED_WIDTH_PX = 56;

/** Matches @media (max-width: 768px) mobile shell in app/globals.css */
export const SCE_MOBILE_SHELL_MAX_WIDTH_PX = 768;

export type ShellLayoutSnapshot = {
  sidebarWidthPx: number;
  collapsed: boolean;
  viewportWidthPx: number;
};

export function resolveEffectiveSidebarWidthPx(
  snapshot: ShellLayoutSnapshot,
): number {
  if (snapshot.viewportWidthPx <= SCE_MOBILE_SHELL_MAX_WIDTH_PX) {
    return 0;
  }
  if (snapshot.collapsed) {
    return SIDEBAR_COLLAPSED_WIDTH_PX;
  }
  return snapshot.sidebarWidthPx;
}

export function applyShellLayoutVarsToDocument(
  snapshot: Omit<ShellLayoutSnapshot, "viewportWidthPx"> & {
    viewportWidthPx?: number;
  },
): void {
  if (typeof document === "undefined") return;

  const viewportWidthPx =
    snapshot.viewportWidthPx ??
    (typeof window !== "undefined" ? window.innerWidth : 1280);

  const root = document.documentElement;
  const isMobileShell = viewportWidthPx <= SCE_MOBILE_SHELL_MAX_WIDTH_PX;

  if (isMobileShell) {
    // Let @media (max-width: 768px) own zero-width shell geometry — inline px overrides break modal inset.
    root.style.removeProperty("--sidebar-width");
    root.style.removeProperty("--sce-sidebar-effective-width");
    return;
  }

  root.style.setProperty("--sidebar-width", `${snapshot.sidebarWidthPx}px`);
  root.style.removeProperty("--sce-sidebar-effective-width");
}

export function readShellLayoutSnapshotFromDocument(): ShellLayoutSnapshot | null {
  if (typeof document === "undefined") return null;

  const root = document.documentElement;
  const sidebarRaw = getComputedStyle(root).getPropertyValue("--sidebar-width").trim();
  const effectiveRaw = getComputedStyle(root)
    .getPropertyValue("--sce-sidebar-effective-width")
    .trim();

  const sidebarWidthPx = parseCssPx(sidebarRaw) ?? SIDEBAR_WIDTH_DEFAULT;
  const collapsed = root.dataset.sidebarCollapsed === "1";

  return {
    sidebarWidthPx,
    collapsed,
    viewportWidthPx: typeof window !== "undefined" ? window.innerWidth : 1280,
  };
}

function parseCssPx(value: string): number | null {
  if (!value) return null;
  const match = /^([\d.]+)px$/.exec(value);
  if (!match) return null;
  const n = Number.parseFloat(match[1]!);
  return Number.isFinite(n) ? n : null;
}
