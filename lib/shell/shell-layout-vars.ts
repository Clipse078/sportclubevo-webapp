/**
 * SCE-RESPONSIVE-01B — explicit document-level shell layout variables for portalled overlays.
 *
 * Modal overlays render on document.body; sidebar width must be mirrored on html so
 * --sce-sidebar-effective-width is always available (never inferred from DOM inheritance).
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

  const effective = resolveEffectiveSidebarWidthPx({
    sidebarWidthPx: snapshot.sidebarWidthPx,
    collapsed: snapshot.collapsed,
    viewportWidthPx,
  });

  const root = document.documentElement;
  root.style.setProperty("--sidebar-width", `${snapshot.sidebarWidthPx}px`);
  root.style.setProperty("--sce-sidebar-effective-width", `${effective}px`);
}

export function readShellLayoutSnapshotFromDocument(): ShellLayoutSnapshot | null {
  if (typeof document === "undefined") return null;

  const root = document.documentElement;
  const sidebarRaw = getComputedStyle(root).getPropertyValue("--sidebar-width").trim();
  const effectiveRaw = getComputedStyle(root)
    .getPropertyValue("--sce-sidebar-effective-width")
    .trim();

  const sidebarWidthPx = parseCssPx(sidebarRaw) ?? SIDEBAR_WIDTH_DEFAULT;
  const effectivePx = parseCssPx(effectiveRaw) ?? sidebarWidthPx;
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
