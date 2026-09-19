/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01I — sidebar remains visible under transparent full-viewport portal stack.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { applyShellLayoutVarsToDocument } from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SceModalOverlay sidebar preservation SCE-RESPONSIVE-01I", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
      viewportWidthPx: 1536,
    });
  });

  it("A — overlay root spans full viewport (transparent); sidebar inset is on content viewport only", () => {
    const css = readGlobalsCss();
    const rootBlock = css.match(/\.sce-modal-overlay-root\s*\{[^}]+\}/)?.[0] ?? "";
    expect(rootBlock).toMatch(/inset:\s*0/);
    expect(rootBlock).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(rootBlock).toMatch(/pointer-events:\s*none/);
    expect(rootBlock).toMatch(/z-index:\s*100/);

    const viewportBlock = css.match(/\.sce-modal-overlay-content-viewport\s*\{[^}]+\}/)?.[0] ?? "";
    expect(viewportBlock).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
  });

  it("B — no sidebar shield layer; interaction layer is transparent", () => {
    const css = readGlobalsCss();
    expect(css).not.toContain(".sce-modal-overlay-sidebar-shield");

    const interactionBlock = css.match(/\.sce-modal-overlay-interaction-layer[\s\S]*?\}/)?.[0] ?? "";
    expect(interactionBlock).toMatch(/background:\s*var\(--sce-modal-backdrop\)/);
    expect(interactionBlock).not.toMatch(/backdrop-filter/);
    expect(interactionBlock).not.toMatch(/filter:/);
    expect(interactionBlock).not.toMatch(/opacity:/);
  });

  it("C — admin shell accessibility hide contract; no visual hide rules on background", () => {
    const css = readGlobalsCss();
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*visibility:\s*hidden/);
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*display:\s*none/);
    expect(css).not.toMatch(/\[inert\][\s\S]*opacity/);
    expect(css).not.toMatch(/\[inert\][\s\S]*visibility:\s*hidden/);

    const overlaySource = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlaySource).toContain("[data-sce-modal-background]");
    expect(overlaySource).toContain("applySceModalOpenSideEffects");
    const lifecycleSource = readSource("lib/ui/sce-modal-open-lifecycle.ts");
    expect(lifecycleSource).toContain("aria-hidden");
    expect(lifecycleSource).not.toContain('setAttribute("inert"');
  });

  it("D — renders single portalled root (no sidebar shield sibling)", () => {
    render(
      <SceModalOverlay open testId="sidebar-preservation">
        <div>Panel</div>
      </SceModalOverlay>,
    );

    expect(screen.queryByTestId("sidebar-preservation-sidebar-shield")).toBeNull();
    const root = screen.getByTestId("sidebar-preservation");
    expect(root.classList.contains("sce-modal-overlay-root")).toBe(true);
    expect(root.parentElement).toBe(document.body);
  });

  it("E — content viewport uses sidebar-aware horizontal band only", () => {
    const css = readGlobalsCss();
    const viewportBlock = css.match(/\.sce-modal-overlay-content-viewport\s*\{[^}]+\}/)?.[0] ?? "";
    expect(viewportBlock).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(viewportBlock).toMatch(/top:\s*0/);
    expect(viewportBlock).toMatch(/bottom:\s*0/);
  });

  it("F — zero-backdrop token remains transparent", () => {
    expect(readGlobalsCss()).toContain("--sce-modal-backdrop: transparent;");
  });

  it("G — mobile shell zeroes effective sidebar width for overlay geometry", () => {
    const css = readGlobalsCss();
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*--sce-sidebar-effective-width:\s*0px/);
  });
});
