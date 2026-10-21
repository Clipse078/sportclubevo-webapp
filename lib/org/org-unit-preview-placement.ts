/**
 * Viewport-aware placement for Organisation Builder contextual preview (screen space).
 * Preview UI is zoom-independent — anchors use getBoundingClientRect(), not canvas scale.
 */

export const SCE_ORG_UNIT_PREVIEW_WIDTH_PX = 320;
export const SCE_ORG_UNIT_PREVIEW_GAP_PX = 10;
export const SCE_ORG_UNIT_PREVIEW_ESTIMATED_HEIGHT_PX = 280;

export type OrgUnitPreviewChromeInsets = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type OrgUnitPreviewAnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type OrgUnitPreviewPlacement = {
  top: number;
  left: number;
  placement: "right" | "left" | "below" | "above";
};

export function computeOrgUnitPreviewPlacement(input: {
  anchor: OrgUnitPreviewAnchorRect;
  viewportWidth: number;
  viewportHeight: number;
  previewWidth?: number;
  previewHeight?: number;
  gap?: number;
  chromeInsets?: OrgUnitPreviewChromeInsets;
}): OrgUnitPreviewPlacement {
  const previewWidth = input.previewWidth ?? SCE_ORG_UNIT_PREVIEW_WIDTH_PX;
  const previewHeight = input.previewHeight ?? SCE_ORG_UNIT_PREVIEW_ESTIMATED_HEIGHT_PX;
  const gap = input.gap ?? SCE_ORG_UNIT_PREVIEW_GAP_PX;
  const topInset = input.chromeInsets?.top ?? 0;
  const rightInset = input.chromeInsets?.right ?? 0;
  const bottomInset = input.chromeInsets?.bottom ?? 0;
  const leftInset = input.chromeInsets?.left ?? 0;

  const maxLeft = input.viewportWidth - rightInset - previewWidth;
  const maxTop = input.viewportHeight - bottomInset - previewHeight;
  const minLeft = leftInset;
  const minTop = topInset;

  const preferRightLeft =
    input.anchor.right + gap + previewWidth <= input.viewportWidth - rightInset;
  const preferLeft = input.anchor.left - gap - previewWidth >= leftInset;

  let placement: OrgUnitPreviewPlacement["placement"] = "right";
  let left: number;
  let top: number;

  if (preferRightLeft) {
    placement = "right";
    left = input.anchor.right + gap;
    top = input.anchor.top + input.anchor.height / 2 - previewHeight / 2;
  } else if (preferLeft) {
    placement = "left";
    left = input.anchor.left - gap - previewWidth;
    top = input.anchor.top + input.anchor.height / 2 - previewHeight / 2;
  } else {
    const belowFits = input.anchor.bottom + gap + previewHeight <= input.viewportHeight - bottomInset;
    if (belowFits) {
      placement = "below";
      left = input.anchor.left + input.anchor.width / 2 - previewWidth / 2;
      top = input.anchor.bottom + gap;
    } else {
      placement = "above";
      left = input.anchor.left + input.anchor.width / 2 - previewWidth / 2;
      top = input.anchor.top - gap - previewHeight;
    }
  }

  left = Math.min(Math.max(left, minLeft), maxLeft);
  top = Math.min(Math.max(top, minTop), maxTop);

  return { top, left, placement };
}
