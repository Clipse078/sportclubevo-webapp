/**
 * Synchronous modal-open side effects — focus before inert, then preserve scroll (01K).
 */

import {
  captureSceBackgroundScrollPositions,
  restoreSceBackgroundScrollPositions,
} from "@/lib/ui/sce-modal-background-scroll";
import { sceFocusWithoutScroll } from "@/lib/ui/sce-modal-focus";

export function applySceModalOpenSideEffects(options: {
  initialFocusTarget: HTMLElement | null | undefined;
  backgroundRoots: HTMLElement[];
}): {
  previousFocus: HTMLElement | null;
  scrollSnapshot: ReturnType<typeof captureSceBackgroundScrollPositions>;
} {
  const scrollSnapshot = captureSceBackgroundScrollPositions();
  const previousFocus = document.activeElement as HTMLElement | null;

  sceFocusWithoutScroll(options.initialFocusTarget ?? null);

  options.backgroundRoots.forEach((el) => el.setAttribute("inert", ""));

  restoreSceBackgroundScrollPositions(scrollSnapshot);

  return { previousFocus, scrollSnapshot };
}

export function releaseSceModalOpenSideEffects(options: {
  backgroundRoots: HTMLElement[];
  previousFocus: HTMLElement | null;
  scrollSnapshot: ReturnType<typeof captureSceBackgroundScrollPositions>;
}): void {
  options.backgroundRoots.forEach((el) => el.removeAttribute("inert"));
  restoreSceBackgroundScrollPositions(options.scrollSnapshot);
  sceFocusWithoutScroll(options.previousFocus);
  restoreSceBackgroundScrollPositions(options.scrollSnapshot);
}
