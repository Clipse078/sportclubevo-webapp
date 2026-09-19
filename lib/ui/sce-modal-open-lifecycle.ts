/**
 * Synchronous modal-open side effects — focus before hiding background from AT (01K/01N).
 *
 * Native `inert` on the admin shell was removed: it could mutate nested scroll containers
 * (sidebar nav) in real browsers despite scroll restoration. Pointer blocking and focus
 * trap are handled by the portalled overlay.
 */

import {
  captureSceBackgroundScrollPositions,
  restoreSceBackgroundScrollPositions,
  type SceBackgroundScrollSnapshot,
} from "@/lib/ui/sce-modal-background-scroll";
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
  scrollSnapshot: SceBackgroundScrollSnapshot;
} {
  const scrollSnapshot = captureSceBackgroundScrollPositions();
  const previousFocus = document.activeElement as HTMLElement | null;

  sceFocusWithoutScroll(options.initialFocusTarget ?? null);
  setSceModalBackgroundHidden(options.backgroundRoots, true);

  return { previousFocus, scrollSnapshot };
}

export function releaseSceModalOpenSideEffects(options: {
  backgroundRoots: HTMLElement[];
  previousFocus: HTMLElement | null;
  scrollSnapshot: SceBackgroundScrollSnapshot;
}): void {
  setSceModalBackgroundHidden(options.backgroundRoots, false);
  restoreSceBackgroundScrollPositions(options.scrollSnapshot);
  sceFocusWithoutScroll(options.previousFocus);
}
