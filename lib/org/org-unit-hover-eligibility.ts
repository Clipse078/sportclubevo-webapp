/**
 * Progressive enhancement for Organisation Builder contextual hover preview.
 * Avoids brittle matchMedia gating; eligibility follows the triggering pointer.
 */

export function isPointerEligibleForHoverPreview(pointerType: string): boolean {
  if (pointerType === "touch") return false;
  return true;
}

export type OrgUnitPreviewAnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function anchorRectFromElement(el: Element): OrgUnitPreviewAnchorRect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}
