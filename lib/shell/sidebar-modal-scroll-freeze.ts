/**
 * Hard-freeze sidebar nav scroll while any SCE modal is open (SCE-RESPONSIVE-01O).
 */

import {
  isSceModalOpen,
  SCE_MODAL_OPEN_CHANGE_EVENT,
  type SceModalOpenChangeDetail,
} from "@/lib/ui/sce-modal-open-state";

export type SidebarScrollFreezeSnapshot = {
  scrollTop: number;
  scrollLeft: number;
};

const SCROLL_INPUT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function enforceFrozenPosition(
  nav: HTMLElement,
  frozen: SidebarScrollFreezeSnapshot,
): void {
  if (nav.scrollTop !== frozen.scrollTop) {
    nav.scrollTop = frozen.scrollTop;
  }
  if (nav.scrollLeft !== frozen.scrollLeft) {
    nav.scrollLeft = frozen.scrollLeft;
  }
}

export function attachSidebarScrollFreezeWhileModalOpen(nav: HTMLElement): () => void {
  let frozen: SidebarScrollFreezeSnapshot | null = null;

  function captureFreeze(): void {
    frozen = {
      scrollTop: nav.scrollTop,
      scrollLeft: nav.scrollLeft,
    };
    enforceFrozenPosition(nav, frozen);
  }

  function clearFreeze(): void {
    frozen = null;
  }

  function onModalOpenChange(event: Event): void {
    const detail = (event as CustomEvent<SceModalOpenChangeDetail>).detail;
    if (detail.open) {
      captureFreeze();
      return;
    }
    if (!isSceModalOpen()) {
      clearFreeze();
    }
  }

  function onScroll(): void {
    if (!frozen) return;
    enforceFrozenPosition(nav, frozen);
  }

  function blockScrollInput(event: Event): void {
    if (!frozen) return;
    event.preventDefault();
    enforceFrozenPosition(nav, frozen);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!frozen) return;
    if (!SCROLL_INPUT_KEYS.has(event.key)) return;
    event.preventDefault();
    enforceFrozenPosition(nav, frozen);
  }

  window.addEventListener(SCE_MODAL_OPEN_CHANGE_EVENT, onModalOpenChange);
  nav.addEventListener("scroll", onScroll, { passive: true });
  nav.addEventListener("wheel", blockScrollInput, { passive: false });
  nav.addEventListener("touchmove", blockScrollInput, { passive: false });
  nav.addEventListener("keydown", onKeyDown);

  if (isSceModalOpen()) {
    captureFreeze();
  }

  return () => {
    window.removeEventListener(SCE_MODAL_OPEN_CHANGE_EVENT, onModalOpenChange);
    nav.removeEventListener("scroll", onScroll);
    nav.removeEventListener("wheel", blockScrollInput);
    nav.removeEventListener("touchmove", blockScrollInput);
    nav.removeEventListener("keydown", onKeyDown);
    if (!isSceModalOpen()) {
      clearFreeze();
    }
  };
}

/** Test helper — simulate browser-initiated scroll drift while frozen. */
export function attemptSidebarScrollMutation(
  nav: HTMLElement,
  nextScrollTop: number,
): void {
  nav.scrollTop = nextScrollTop;
  nav.dispatchEvent(new Event("scroll", { bubbles: true }));
}
