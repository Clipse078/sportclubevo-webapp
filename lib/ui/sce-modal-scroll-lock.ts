/**
 * Background scroll lock for portalled SCE modals.
 * Preserves window scroll position — lock/unlock must not move the document.
 */

export type SceDocumentScrollSnapshot = {
  scrollX: number;
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
};

export function captureSceDocumentScrollSnapshot(): SceDocumentScrollSnapshot {
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPaddingRight: document.body.style.paddingRight,
  };
}

export function applySceDocumentScrollLock(snapshot: SceDocumentScrollSnapshot): void {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  if (window.scrollX !== snapshot.scrollX || window.scrollY !== snapshot.scrollY) {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
}

export function releaseSceDocumentScrollLock(snapshot: SceDocumentScrollSnapshot): void {
  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;

  if (window.scrollX !== snapshot.scrollX || window.scrollY !== snapshot.scrollY) {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
}

export function lockSceDocumentScroll(): () => void {
  const snapshot = captureSceDocumentScrollSnapshot();
  applySceDocumentScrollLock(snapshot);
  return () => releaseSceDocumentScrollLock(snapshot);
}
