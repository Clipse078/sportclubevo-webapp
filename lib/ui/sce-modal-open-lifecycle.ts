/**
 * Minimal modal-open side effects (SCE-RESPONSIVE-01P):
 * focus dialog heading, hide background from assistive tech — no scroll mutation.
 */

import { sceFocusWithoutScroll } from "@/lib/ui/sce-modal-focus";

export const SCE_MODAL_BACKGROUND_HIDDEN_ATTR = "aria-hidden";

export function setSceModalBackgroundHidden(roots: HTMLElement[], hidden: boolean): void {
  roots.forEach((el) => {
    if (hidden) {
      el.setAttribute(SCE_MODAL_BACKGROUND_HIDDEN_ATTR, "true");
    } else {
      el.removeAttribute(SCE_MODAL_BACKGROUND_HIDDEN_ATTR);
    }
  });
}

export function applySceModalOpenSideEffects(options: {
  initialFocusTarget: HTMLElement | null | undefined;
  backgroundRoots: HTMLElement[];
}): {
  previousFocus: HTMLElement | null;
} {
  const previousFocus = document.activeElement as HTMLElement | null;
  sceFocusWithoutScroll(options.initialFocusTarget ?? null);
  setSceModalBackgroundHidden(options.backgroundRoots, true);
  return { previousFocus };
}

export function releaseSceModalOpenSideEffects(options: {
  backgroundRoots: HTMLElement[];
  previousFocus: HTMLElement | null;
}): void {
  setSceModalBackgroundHidden(options.backgroundRoots, false);
  sceFocusWithoutScroll(options.previousFocus);
}
