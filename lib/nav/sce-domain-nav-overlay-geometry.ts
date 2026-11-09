/**
 * SCE-DS2-05B-R7 — deterministic domain-nav overlay geometry.
 *
 * The overlay is portalled out of the header and positioned from a stable
 * primary-row anchor. Panel size is never an input, so measuring the overlay
 * cannot change its own top or max-height.
 */

export const SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_REM = 26;
export const SCE_DOMAIN_NAV_OVERLAY_VIEWPORT_GAP_PX = 12;
export const SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX =
  SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_REM * 16;
export const SCE_DOMAIN_NAV_OVERLAY_ANCHOR_SELECTOR =
  "[data-sce-domain-nav-overlay-anchor]";
export const SCE_DOMAIN_NAV_OVERLAY_PRIMARY_SELECTOR =
  '[data-sce-nav-spine-row="primary"]';

export type DomainNavOverlayGeometry = {
  top: number;
  maxHeight: number;
};

export function resolveDomainNavOverlayAnchor(
  header: HTMLElement | null,
): HTMLElement | null {
  if (!header) return null;
  return (
    header.querySelector<HTMLElement>(SCE_DOMAIN_NAV_OVERLAY_ANCHOR_SELECTOR) ??
    header.querySelector<HTMLElement>(SCE_DOMAIN_NAV_OVERLAY_PRIMARY_SELECTOR) ??
    header
  );
}

export function resolveDomainNavOverlayAnchorBottom(
  header: HTMLElement | null,
): number {
  const anchor = resolveDomainNavOverlayAnchor(header);
  if (!anchor) return 0;
  const rect = anchor.getBoundingClientRect();
  return rect.height === 0 ? rect.top : rect.bottom;
}

export function computeDomainNavOverlayGeometry(
  anchorBottom: number,
  viewportHeight: number,
): DomainNavOverlayGeometry {
  const top = Math.max(0, Math.round(anchorBottom));
  const available = Math.max(
    0,
    Math.round(viewportHeight) - top - SCE_DOMAIN_NAV_OVERLAY_VIEWPORT_GAP_PX,
  );
  return {
    top,
    maxHeight: Math.min(SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_PX, available),
  };
}

export function domainNavOverlayStyle(
  geometry: DomainNavOverlayGeometry,
): { top: string; ["--sce-domain-nav-overlay-max-height"]: string } {
  return {
    top: `${geometry.top}px`,
    "--sce-domain-nav-overlay-max-height": `min(${SCE_DOMAIN_NAV_OVERLAY_MAX_HEIGHT_REM}rem, calc(100dvh - ${geometry.top}px - 0.75rem))`,
  };
}

export function overlayGeometriesEqual(
  a: DomainNavOverlayGeometry | null,
  b: DomainNavOverlayGeometry,
): boolean {
  return a != null && a.top === b.top && a.maxHeight === b.maxHeight;
}

export function resolveDomainNavOverlayPortalTarget(
  header: HTMLElement | null,
): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const shell = header?.closest(".sce-authenticated-app-shell");
  if (shell instanceof HTMLElement) return shell;
  return document.body;
}

export function resolveDomainNavOverlayTheme(
  header: HTMLElement | null,
): string | null {
  return header?.closest("[data-sce-theme]")?.getAttribute("data-sce-theme") ?? null;
}
