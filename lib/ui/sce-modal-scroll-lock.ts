/**
 * SCE-RESPONSIVE-01P — portalled overlays no longer mutate document scroll/layout.
 * Background interaction is blocked by the fixed interaction layer + focus trap.
 */

export type SceDocumentScrollSnapshot = {
  scrollX: number;
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
};

export function captureSceDocumentScrollSnapshot(): SceDocumentScrollSnapshot {
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
  };
}

/** No-op — retained for API compatibility; must not write overflow or call scrollTo. */
export function applySceDocumentScrollLock(_snapshot: SceDocumentScrollSnapshot): void {}

/** No-op */
export function releaseSceDocumentScrollLock(_snapshot: SceDocumentScrollSnapshot): void {}

export function lockSceDocumentScroll(): () => void {
  return () => {};
}
