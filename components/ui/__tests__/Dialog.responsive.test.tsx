import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Dialog SCE-RESPONSIVE-01", () => {
  it("uses SceModalOverlay and content-viewport-sized presets", () => {
    const dialog = readSource("components/ui/Dialog.tsx");
    expect(dialog).toContain("SceModalOverlay");
    expect(dialog).toContain("SCE_DIALOG_PANEL_BASE");
    expect(dialog).toContain("workspace");
    expect(dialog).not.toContain("fixed inset-0 z-50 flex items-center justify-center");
  });

  it("SceModalOverlay portalls and uses sidebar-inset content viewport", () => {
    const overlay = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlay).toContain("createPortal");
    expect(overlay).toContain("SCE_OVERLAY_CONTENT_VIEWPORT");
    expect(overlay).not.toContain("translate-x");
    expect(overlay).not.toContain("lockSceDocumentScroll");
  });

  it("Dialog uses shared modal focus helper with preventScroll semantics", () => {
    const dialog = readSource("components/ui/Dialog.tsx");
    expect(dialog).toContain("useSceModalDialog");
    expect(dialog).not.toMatch(/panelRef\.current\?\.focus\(\)/);
  });

  it("Dialog panel shell caps height and contains overflow for scrollable body + fixed footer", () => {
    const layout = readSource("lib/shell/responsive-layout.ts");
    expect(layout).toMatch(/SCE_DIALOG_PANEL_BASE[\s\S]*overflow-hidden/);
    expect(layout).toMatch(/SCE_DIALOG_PANEL_BASE[\s\S]*max-h-\[var\(--sce-dialog-max-height\)\]/);
    const dialog = readSource("components/ui/Dialog.tsx");
    expect(dialog).toContain("data-sce-dialog-shell");
    expect(dialog).toContain("SCE_DIALOG_BODY");
    expect(dialog).toContain("SCE_DIALOG_FOOTER");
  });
});
