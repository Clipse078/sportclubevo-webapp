/**
 * Canonical background scroll preservation for portalled SCE modals (SCE-RESPONSIVE-01K).
 *
 * Window scroll and explicit planner scroll roots are snapshotted together — preserving
 * only window.scrollY is insufficient when nested regions scroll independently.
 */

export const SCE_PLANNER_SCROLL_ROOT_ATTR = "data-sce-planner-scroll-root";
export const SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR = "data-sce-planner-calendar-scroll-root";

export const SCE_MODAL_BACKGROUND_SCROLL_SELECTORS = [
  `[${SCE_PLANNER_SCROLL_ROOT_ATTR}]`,
  `[${SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR}]`,
] as const;

export type SceBackgroundScrollContainerSnapshot = {
  scrollTop: number;
  scrollLeft: number;
};

export type SceBackgroundScrollSnapshot = {
  windowScrollX: number;
  windowScrollY: number;
  containers: Array<{ element: HTMLElement } & SceBackgroundScrollContainerSnapshot>;
};

export function querySceBackgroundScrollContainers(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  for (const selector of SCE_MODAL_BACKGROUND_SCROLL_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        result.push(el);
      }
    });
  }
  return result;
}

export function captureSceBackgroundScrollPositions(): SceBackgroundScrollSnapshot {
  const containers = querySceBackgroundScrollContainers().map((element) => ({
    element,
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
  }));

  return {
    windowScrollX: window.scrollX,
    windowScrollY: window.scrollY,
    containers,
  };
}

export function restoreSceBackgroundScrollPositions(snapshot: SceBackgroundScrollSnapshot): void {
  if (window.scrollX !== snapshot.windowScrollX || window.scrollY !== snapshot.windowScrollY) {
    window.scrollTo(snapshot.windowScrollX, snapshot.windowScrollY);
  }

  for (const entry of snapshot.containers) {
    const { element, scrollTop, scrollLeft } = entry;
    if (element.scrollTop !== scrollTop) {
      element.scrollTop = scrollTop;
    }
    if (element.scrollLeft !== scrollLeft) {
      element.scrollLeft = scrollLeft;
    }
  }
}
