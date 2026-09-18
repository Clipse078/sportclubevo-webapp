import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APP_MAIN_COLUMN,
  SCE_DIALOG_WORKSPACE_PANEL,
  SCE_OVERLAY_CONTENT_VIEWPORT,
  SCE_OVERLAY_ROOT,
  SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX,
} from "@/lib/shell/responsive-layout";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-RESPONSIVE-01 responsive-layout contract", () => {
  it("exports content-viewport overlay positioning (not raw 100vw centering)", () => {
    expect(SCE_OVERLAY_ROOT).toBe("sce-modal-overlay-root");
    expect(SCE_OVERLAY_CONTENT_VIEWPORT).toBe("sce-modal-overlay-content-viewport");
  });

  it("workspace dialog panel uses CSS max-width token", () => {
    expect(SCE_DIALOG_WORKSPACE_PANEL).toContain("--sce-dialog-workspace-max-width");
    expect(SCE_DIALOG_WORKSPACE_DESIRED_MAX_PX).toBe(1560);
  });

  it("authenticated main column allows flex shrink", () => {
    expect(SCE_APP_MAIN_COLUMN).toContain("min-w-0");
  });

  it("globals.css defines content viewport and collapsed sidebar override", () => {
    const css = readSource("app/globals.css");
    expect(css).toContain("--sce-content-viewport-width");
    expect(css).toContain("--sce-dialog-workspace-max-width");
    expect(css).toContain('html[data-sidebar-collapsed="1"]');
    expect(css).toContain(".sce-modal-overlay-content-viewport");
    expect(css).toContain("left: var(--sce-sidebar-effective-width)");
  });

  it("admin layout uses SCE_APP_MAIN_COLUMN", () => {
    const layout = readSource("app/(admin)/layout.tsx");
    expect(layout).toContain("SCE_APP_MAIN_COLUMN");
  });
});
