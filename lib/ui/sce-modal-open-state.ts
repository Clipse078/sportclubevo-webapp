/**
 * Shell-level SCE modal open marker (SCE-RESPONSIVE-01O).
 * Reference-counted — safe for nested portalled overlays.
 */

export const SCE_MODAL_OPEN_ATTR = "data-sce-modal-open";

export const SCE_MODAL_OPEN_CHANGE_EVENT = "sce-modal-open-change";

export type SceModalOpenChangeDetail = { open: boolean; count: number };

let openCount = 0;

function syncDocumentMarker(): void {
  if (typeof document === "undefined") return;
  if (openCount > 0) {
    document.documentElement.setAttribute(SCE_MODAL_OPEN_ATTR, "1");
  } else {
    document.documentElement.removeAttribute(SCE_MODAL_OPEN_ATTR);
  }
}

function dispatchOpenChange(open: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SceModalOpenChangeDetail>(SCE_MODAL_OPEN_CHANGE_EVENT, {
      detail: { open, count: openCount },
    }),
  );
}

export function getSceModalOpenCount(): number {
  return openCount;
}

export function isSceModalOpen(): boolean {
  return openCount > 0;
}

/** Call when a portalled SCE modal becomes active. Returns release for cleanup. */
export function acquireSceModalOpenState(): () => void {
  const wasOpen = openCount > 0;
  openCount += 1;
  syncDocumentMarker();
  if (!wasOpen) {
    dispatchOpenChange(true);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openCount = Math.max(0, openCount - 1);
    syncDocumentMarker();
    if (openCount === 0) {
      dispatchOpenChange(false);
    }
  };
}

/** Test-only reset — not used in production UI. */
export function resetSceModalOpenStateForTests(): void {
  openCount = 0;
  syncDocumentMarker();
}
