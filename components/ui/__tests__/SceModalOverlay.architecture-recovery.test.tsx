/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01I — viewport-fixed root vs sidebar-aware content region.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { applyShellLayoutVarsToDocument } from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function rootBlock(css: string): string {
  return css.match(/\.sce-modal-overlay-root\s*\{[^}]+\}/)?.[0] ?? "";
}

function contentViewportBlock(css: string): string {
  return css.match(/\.sce-modal-overlay-content-viewport\s*\{[^}]+\}/)?.[0] ?? "";
}

describe("SceModalOverlay architecture recovery SCE-RESPONSIVE-01I", () => {
  const scrollToSpy = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.spyOn(window, "scrollTo").mockImplementation(scrollToSpy);
    Object.defineProperty(window, "scrollY", { value: 1200, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
      viewportWidthPx: 1536,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("19 — root is viewport-fixed inset 0; vertical geometry is not document-relative", () => {
    const css = readGlobalsCss();
    const root = rootBlock(css);
    expect(root).toMatch(/position:\s*fixed/);
    expect(root).toMatch(/inset:\s*0/);
    expect(root).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);

    const viewport = contentViewportBlock(css);
    expect(viewport).toMatch(/top:\s*0/);
    expect(viewport).toMatch(/bottom:\s*0/);
    expect(viewport).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);

    render(
      <SceModalOverlay open testId="scroll-geometry">
        <div data-testid="panel">Panel</div>
      </SceModalOverlay>,
    );

    expect(window.scrollY).toBe(1200);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("20 — locks root vs content viewport: sidebar offset only on content region", () => {
    const css = readGlobalsCss();
    expect(rootBlock(css)).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(contentViewportBlock(css)).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);

    const overlaySource = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlaySource).not.toContain("sce-modal-overlay-sidebar-shield");
    expect(overlaySource).toContain("sce-modal-overlay-interaction-layer");
  });

  it("21 — transparent stack: no visual backdrop, blur, or inert styling", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-modal-backdrop: rgb(2 6 15 / 42%);");

    const interactionBlock =
      css.match(/\.sce-modal-overlay-interaction-layer[\s\S]*?\}/)?.[0] ??
      css.match(/\.sce-modal-overlay-backdrop\s*\{[^}]+\}/)?.[0] ??
      "";
    expect(interactionBlock).toMatch(/background:\s*var\(--sce-modal-backdrop\)/);
    expect(interactionBlock).not.toMatch(/backdrop-filter/);
    expect(interactionBlock).not.toMatch(/opacity:/);

    expect(rootBlock(css)).not.toMatch(/background:/);
    expect(rootBlock(css)).not.toMatch(/opacity:/);
    expect(css).not.toMatch(/\[inert\][\s\S]*opacity/);
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*opacity/);
    expect(css).not.toContain(".sce-modal-overlay-sidebar-shield");
  });

  it("19 — opening modal at scrollY 1200 does not call scrollTo or scrollIntoView", async () => {
    const scrollIntoViewSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    render(
      <SceModalOverlay open testId="no-scroll-mutation">
        <div tabIndex={-1}>Panel</div>
      </SceModalOverlay>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("no-scroll-mutation")).toBeInTheDocument();
    });

    expect(window.scrollY).toBe(1200);
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("renders single portalled root with interaction layer and content viewport", () => {
    render(
      <SceModalOverlay open testId="layer-stack">
        <div>Panel</div>
      </SceModalOverlay>,
    );

    const root = screen.getByTestId("layer-stack");
    expect(root.parentElement).toBe(document.body);
    expect(root.querySelector(".sce-modal-overlay-interaction-layer")).toBeTruthy();
    expect(root.querySelector(".sce-modal-overlay-content-viewport")).toBeTruthy();
  });
});
