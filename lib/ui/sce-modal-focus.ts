/**
 * SCE modal focus helpers — prevent document/planner scroll on focus moves.
 */

export function sceFocusWithoutScroll(element: HTMLElement | null | undefined): boolean {
  if (!element?.focus) return false;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  return document.activeElement === element;
}

export const SCE_MODAL_FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function getSceModalFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(SCE_MODAL_FOCUSABLE_SELECTOR));
}
