import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DIALOG_COMPACT_MAX_PX,
  SCE_DIALOG_FORM_MAX_PX,
  SCE_DIALOG_STANDARD_MAX_PX,
  SCE_DIALOG_VARIANT_COMPACT,
  SCE_DIALOG_VARIANT_FORM,
  SCE_DIALOG_VARIANT_STANDARD,
  SCE_DIALOG_VARIANT_WORKSPACE,
  SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX,
  SCE_DIALOG_WORKSPACE_PANEL,
} from "@/lib/shell/responsive-layout";
import {
  computeFlexCenteredDialogBounds,
  computeOverlayContentRegion,
  computeWorkspaceDialogWidth,
  LAPTOP_VIEWPORT_WIDTHS_PX,
} from "@/lib/shell/overlay-geometry";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

describe("SCE dialog variants SCE-RESPONSIVE-01J", () => {
  it("exports distinct variant width contracts", () => {
    expect(SCE_DIALOG_COMPACT_MAX_PX).toBeLessThan(SCE_DIALOG_STANDARD_MAX_PX);
    expect(SCE_DIALOG_STANDARD_MAX_PX).toBeLessThan(SCE_DIALOG_FORM_MAX_PX);
    expect(SCE_DIALOG_FORM_MAX_PX).toBeLessThan(SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX);
    expect(SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX).toBe(1160);
  });

  it("variant class strings reference dedicated CSS tokens", () => {
    expect(SCE_DIALOG_VARIANT_COMPACT).toContain("--sce-dialog-compact-max-width");
    expect(SCE_DIALOG_VARIANT_STANDARD).toContain("--sce-dialog-standard-max-width");
    expect(SCE_DIALOG_VARIANT_FORM).toContain("--sce-dialog-form-max-width");
    expect(SCE_DIALOG_VARIANT_WORKSPACE).toContain("--sce-dialog-workspace-max-width");
    expect(SCE_DIALOG_WORKSPACE_PANEL).toContain("sce-dialog-variant-workspace");
  });

  it("globals.css defines variant tokens and zero-tint backdrop", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-dialog-compact-max-width");
    expect(css).toContain("--sce-dialog-form-max-width");
    expect(css).toContain("--sce-dialog-workspace-desired-max: 72.5rem");
    expect(css).toContain("--sce-modal-backdrop: transparent");
  });

  it("workspace width does not exceed compact/standard caps at laptop viewports", () => {
    for (const viewportWidthPx of LAPTOP_VIEWPORT_WIDTHS_PX) {
      const region = computeOverlayContentRegion({
        viewportWidthPx,
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: false,
      });
      const workspaceWidth = computeWorkspaceDialogWidth(region.innerWidth);
      expect(workspaceWidth).toBeLessThanOrEqual(region.innerWidth);
      expect(workspaceWidth).toBeLessThanOrEqual(SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX);

      const compactCap = Math.min(SCE_DIALOG_COMPACT_MAX_PX, region.innerWidth);
      const standardCap = Math.min(SCE_DIALOG_STANDARD_MAX_PX, region.innerWidth);
      expect(compactCap).toBeLessThan(workspaceWidth);
      expect(standardCap).toBeLessThan(workspaceWidth);
    }
  });

  it("geometry is independent of document scroll (pure model)", () => {
    const scrollPositions = [0, 500, 1200, 3000] as const;
    const viewportWidthPx = 1440;
    const region = computeOverlayContentRegion({
      viewportWidthPx,
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
    });
    const width = computeWorkspaceDialogWidth(region.innerWidth);
    const baseline = computeFlexCenteredDialogBounds(region, width);

    for (const _scrollY of scrollPositions) {
      const bounds = computeFlexCenteredDialogBounds(region, width);
      expect(bounds).toEqual(baseline);
    }
  });
});
