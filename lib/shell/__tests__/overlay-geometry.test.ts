import { describe, expect, it } from "vitest";
import {
  assertDialogWithinContentRegion,
  assertDialogWithinVerticalViewport,
  computeFlexCenteredDialogBounds,
  computeFlexCenteredDialogVerticalBounds,
  computeOverlayContentRegion,
  computeWorkspaceDialogWidth,
  LAPTOP_VIEWPORT_WIDTHS_PX,
  SCE_OVERLAY_GUTTER_PX,
} from "@/lib/shell/overlay-geometry";
import { SIDEBAR_COLLAPSED_WIDTH_PX } from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT, SIDEBAR_WIDTH_MAX } from "@/lib/shell/sidebar-width";

describe("overlay-geometry SCE-RESPONSIVE-01B", () => {
  describe("CASE A — expanded sidebar", () => {
    it.each(LAPTOP_VIEWPORT_WIDTHS_PX)(
      "viewport %ipx — dialog stays inside content region with default sidebar",
      (viewportWidthPx) => {
        const region = computeOverlayContentRegion({
          viewportWidthPx,
          sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
          collapsed: false,
        });
        const dialogWidth = computeWorkspaceDialogWidth(region.innerWidth);
        const dialog = computeFlexCenteredDialogBounds(region, dialogWidth);
        const result = assertDialogWithinContentRegion(dialog, region);
        expect(result.violations, result.violations.join("; ")).toEqual([]);
      },
    );

    it.each(LAPTOP_VIEWPORT_WIDTHS_PX)(
      "viewport %ipx — max-width sidebar (%ipx) still fits",
      (viewportWidthPx) => {
        const region = computeOverlayContentRegion({
          viewportWidthPx,
          sidebarWidthPx: SIDEBAR_WIDTH_MAX,
          collapsed: false,
        });
        const dialogWidth = computeWorkspaceDialogWidth(region.innerWidth);
        const dialog = computeFlexCenteredDialogBounds(region, dialogWidth);
        expect(assertDialogWithinContentRegion(dialog, region).ok).toBe(true);
      },
    );
  });

  describe("CASE B — collapsed sidebar", () => {
    it.each(LAPTOP_VIEWPORT_WIDTHS_PX)(
      "viewport %ipx — uses collapsed inset and gains width",
      (viewportWidthPx) => {
        const expanded = computeOverlayContentRegion({
          viewportWidthPx,
          sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
          collapsed: false,
        });
        const collapsed = computeOverlayContentRegion({
          viewportWidthPx,
          sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
          collapsed: true,
        });
        expect(collapsed.effectiveSidebarWidthPx).toBe(SIDEBAR_COLLAPSED_WIDTH_PX);
        expect(collapsed.innerWidth).toBeGreaterThan(expanded.innerWidth);
        const dialog = computeFlexCenteredDialogBounds(
          collapsed,
          computeWorkspaceDialogWidth(collapsed.innerWidth),
        );
        expect(assertDialogWithinContentRegion(dialog, collapsed).ok).toBe(true);
      },
    );
  });

  describe("CASE C — resized sidebar", () => {
    it("follows custom persisted sidebar width", () => {
      const customWidth = 280;
      const region = computeOverlayContentRegion({
        viewportWidthPx: 1536,
        sidebarWidthPx: customWidth,
        collapsed: false,
      });
      expect(region.effectiveSidebarWidthPx).toBe(customWidth);
      expect(region.regionLeft).toBe(customWidth);
      const dialog = computeFlexCenteredDialogBounds(
        region,
        computeWorkspaceDialogWidth(region.innerWidth),
      );
      expect(dialog.left).toBeGreaterThanOrEqual(customWidth + SCE_OVERLAY_GUTTER_PX);
    });
  });

  describe("CASE D — mobile / narrow shell", () => {
    it("effective sidebar width is 0 at mobile breakpoint", () => {
      const region = computeOverlayContentRegion({
        viewportWidthPx: 768,
        sidebarWidthPx: SIDEBAR_WIDTH_MAX,
        collapsed: false,
      });
      expect(region.effectiveSidebarWidthPx).toBe(0);
      const dialog = computeFlexCenteredDialogBounds(
        region,
        computeWorkspaceDialogWidth(region.innerWidth),
      );
      expect(assertDialogWithinContentRegion(dialog, region).ok).toBe(true);
    });
  });

  describe("vertical geometry M", () => {
    it.each(LAPTOP_VIEWPORT_WIDTHS_PX)(
      "viewport %ipx height — workspace dialog fits within vertical gutters",
      (viewportWidthPx) => {
        const viewportHeightPx = 864;
        const region = computeOverlayContentRegion({
          viewportWidthPx,
          sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
          collapsed: false,
        });
        const dialogWidth = computeWorkspaceDialogWidth(region.innerWidth);
        const horizontal = computeFlexCenteredDialogBounds(region, dialogWidth);
        const vertical = computeFlexCenteredDialogVerticalBounds({
          viewportHeightPx,
          dialogHeightPx: viewportHeightPx * 0.85,
        });
        const dialog = { ...horizontal, ...vertical };
        expect(
          assertDialogWithinVerticalViewport(dialog, viewportHeightPx, region.gutterPx).ok,
        ).toBe(true);
        expect(assertDialogWithinContentRegion(dialog, region).ok).toBe(true);
      },
    );
  });

  it("fails when dialog is viewport-centered (regression sentinel)", () => {
    const viewportWidthPx = 1536;
    const sidebar = SIDEBAR_WIDTH_DEFAULT;
    const region = computeOverlayContentRegion({
      viewportWidthPx,
      sidebarWidthPx: sidebar,
      collapsed: false,
    });
    const viewportCenteredWidth = computeWorkspaceDialogWidth(
      viewportWidthPx - 2 * SCE_OVERLAY_GUTTER_PX,
    );
    const wrongLeft =
      SCE_OVERLAY_GUTTER_PX + (viewportWidthPx - 2 * SCE_OVERLAY_GUTTER_PX - viewportCenteredWidth) / 2;
    const wrongDialog = {
      left: wrongLeft,
      right: wrongLeft + viewportCenteredWidth,
      width: viewportCenteredWidth,
    };
    expect(assertDialogWithinContentRegion(wrongDialog, region).ok).toBe(false);
  });
});
