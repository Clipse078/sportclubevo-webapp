/**
 * Deterministic overlay / dialog geometry model (SCE-RESPONSIVE-01B).
 * Mirrors the CSS contract: content region inset by effective sidebar width, flex-centered panel.
 */

import {
  resolveEffectiveSidebarWidthPx,
  SIDEBAR_COLLAPSED_WIDTH_PX,
  type ShellLayoutSnapshot,
} from "@/lib/shell/shell-layout-vars";
import { SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX } from "@/lib/shell/responsive-layout";
import { SIDEBAR_WIDTH_DEFAULT, SIDEBAR_WIDTH_MAX } from "@/lib/shell/sidebar-width";

/** Default --sce-overlay-gutter (1rem) at 16px root font. */
export const SCE_OVERLAY_GUTTER_PX = 16;

export type ContentRegionBounds = {
  /** Left edge of the overlay content viewport (px from viewport origin). */
  regionLeft: number;
  /** Right edge of the overlay content viewport. */
  regionRight: number;
  regionWidth: number;
  /** Inner bounds after padding (where the dialog panel may sit). */
  innerLeft: number;
  innerRight: number;
  innerWidth: number;
  gutterPx: number;
  effectiveSidebarWidthPx: number;
};

export type DialogBounds = {
  left: number;
  right: number;
  width: number;
};

export function computeOverlayContentRegion(options: {
  viewportWidthPx: number;
  sidebarWidthPx: number;
  collapsed: boolean;
  gutterPx?: number;
}): ContentRegionBounds {
  const gutterPx = options.gutterPx ?? SCE_OVERLAY_GUTTER_PX;
  const effectiveSidebarWidthPx = resolveEffectiveSidebarWidthPx({
    sidebarWidthPx: options.sidebarWidthPx,
    collapsed: options.collapsed,
    viewportWidthPx: options.viewportWidthPx,
  });

  const regionLeft = effectiveSidebarWidthPx;
  const regionRight = options.viewportWidthPx;
  const regionWidth = regionRight - regionLeft;
  const innerLeft = regionLeft + gutterPx;
  const innerRight = regionRight - gutterPx;
  const innerWidth = Math.max(0, innerRight - innerLeft);

  return {
    regionLeft,
    regionRight,
    regionWidth,
    innerLeft,
    innerRight,
    innerWidth,
    gutterPx,
    effectiveSidebarWidthPx,
  };
}

export function computeWorkspaceDialogWidth(innerWidth: number): number {
  return Math.min(SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX, innerWidth);
}

/** Flex-centered panel within the padded content region. */
export function computeFlexCenteredDialogBounds(
  region: ContentRegionBounds,
  dialogWidth: number,
): DialogBounds {
  const width = Math.min(dialogWidth, region.innerWidth);
  const left = region.innerLeft + (region.innerWidth - width) / 2;
  return {
    left,
    right: left + width,
    width,
  };
}

export type GeometryInvariantResult = {
  ok: boolean;
  violations: string[];
};

export function assertDialogWithinContentRegion(
  dialog: DialogBounds,
  region: ContentRegionBounds,
): GeometryInvariantResult {
  const violations: string[] = [];
  const minLeft = region.effectiveSidebarWidthPx + region.gutterPx;
  const maxRight = region.regionRight - region.gutterPx;

  if (dialog.left < minLeft - 0.5) {
    violations.push(
      `dialog left ${dialog.left}px < sidebar+gutter ${minLeft}px`,
    );
  }
  if (dialog.right > maxRight + 0.5) {
    violations.push(
      `dialog right ${dialog.right}px > viewport-gutter ${maxRight}px`,
    );
  }
  if (dialog.width > region.innerWidth + 0.5) {
    violations.push(
      `dialog width ${dialog.width}px > inner region ${region.innerWidth}px`,
    );
  }

  return { ok: violations.length === 0, violations };
}

export const LAPTOP_VIEWPORT_WIDTHS_PX = [1280, 1366, 1440, 1536, 1920] as const;

export function defaultExpandedSidebarSnapshot(
  viewportWidthPx: number,
  sidebarWidthPx: number = SIDEBAR_WIDTH_DEFAULT,
): ShellLayoutSnapshot {
  return {
    viewportWidthPx,
    sidebarWidthPx,
    collapsed: false,
  };
}

export { SIDEBAR_WIDTH_MAX, SIDEBAR_COLLAPSED_WIDTH_PX };
