const DEFAULT_SCROLL_OFFSET_PX = 144;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sum sticky app chrome + meeting section nav for scroll positioning. */
export function measureMeetingWorkspaceScrollOffset(navEl: HTMLElement | null): number {
  let offset = 0;
  const appHeader = document.querySelector<HTMLElement>(".sce-global-app-header");
  if (appHeader) {
    offset += appHeader.getBoundingClientRect().height;
  }
  if (navEl) {
    offset += navEl.getBoundingClientRect().height;
  }
  return offset > 0 ? Math.ceil(offset) + 8 : DEFAULT_SCROLL_OFFSET_PX;
}

export function scrollMeetingWorkspaceSectionHeading(
  headingEl: HTMLElement,
  navEl: HTMLElement | null,
): void {
  const top = computeClampedSectionScrollTop(headingEl, navEl);
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  window.scrollTo({ top, behavior });
}

export function computeClampedSectionScrollTop(
  headingEl: HTMLElement,
  navEl: HTMLElement | null,
): number {
  const offset = measureMeetingWorkspaceScrollOffset(navEl);
  const ideal = headingEl.getBoundingClientRect().top + window.scrollY - offset;
  const maxScroll = Math.max(
    0,
    (document.documentElement?.scrollHeight ?? 0) - window.innerHeight,
  );
  return Math.min(Math.max(0, ideal), maxScroll);
}