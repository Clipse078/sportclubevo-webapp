/**
 * Background scroll lock for portalled SCE modals.
 * Avoids body padding / scrollbar compensation — that reflow can shift nested scroll owners.
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

export function applySceDocumentScrollLock(snapshot: SceDocumentScrollSnapshot): void {
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  if (window.scrollX !== snapshot.scrollX || window.scrollY !== snapshot.scrollY) {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
}

export function releaseSceDocumentScrollLock(snapshot: SceDocumentScrollSnapshot): void {
  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.body.style.overflow = snapshot.bodyOverflow;

  if (window.scrollX !== snapshot.scrollX || window.scrollY !== snapshot.scrollY) {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
}

export function lockSceDocumentScroll(): () => void {
  const snapshot = captureSceDocumentScrollSnapshot();
  applySceDocumentScrollLock(snapshot);
  return () => releaseSceDocumentScrollLock(snapshot);
}
