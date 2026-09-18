/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01H — sidebar remains visually present while modal is open.
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

describe("SceModalOverlay sidebar preservation SCE-RESPONSIVE-01H", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
      viewportWidthPx: 1536,
    });
  });

  it("A — overlay root is inset to application region, not full viewport", () => {
    const css = readGlobalsCss();
    const rootBlock = css.match(/\.sce-modal-overlay-root\s*\{[^}]+\}/)?.[0] ?? "";
    expect(rootBlock).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(rootBlock).not.toMatch(/inset:\s*0/);
    expect(rootBlock).toMatch(/z-index:\s*100/);
  });

  it("B — sidebar shield is transparent and does not use visual dimming", () => {
    const css = readGlobalsCss();
    const shieldBlock = css.match(/\.sce-modal-overlay-sidebar-shield\s*\{[^}]+\}/)?.[0] ?? "";
    expect(shieldBlock).toMatch(/background:\s*transparent/);
    expect(shieldBlock).not.toMatch(/backdrop-filter/);
    expect(shieldBlock).not.toMatch(/filter:/);
    expect(shieldBlock).not.toMatch(/opacity:/);
    expect(shieldBlock).toMatch(/width:\s*var\(--sce-sidebar-effective-width\)/);
  });

  it("C — admin shell inert contract unchanged; no visual hide rules on background or inert", () => {
    const css = readGlobalsCss();
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*visibility:\s*hidden/);
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*display:\s*none/);
    expect(css).not.toMatch(/\[inert\][\s\S]*opacity/);
    expect(css).not.toMatch(/\[inert\][\s\S]*visibility:\s*hidden/);

    const overlaySource = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlaySource).toContain("[data-sce-modal-background]");
    expect(overlaySource).toContain('setAttribute("inert"');
  });

  it("D — renders transparent sidebar shield and application-region overlay", () => {
    render(
      <SceModalOverlay open testId="sidebar-preservation">
        <div>Panel</div>
      </SceModalOverlay>,
    );

    expect(screen.getByTestId("sidebar-preservation-sidebar-shield")).toBeInTheDocument();
    const root = screen.getByTestId("sidebar-preservation");
    expect(root.classList.contains("sce-modal-overlay-root")).toBe(true);
    expect(root.parentElement).toBe(document.body);
  });

  it("E — content viewport fills overlay root (no double sidebar inset)", () => {
    const css = readGlobalsCss();
    const viewportBlock = css.match(/\.sce-modal-overlay-content-viewport\s*\{[^}]+\}/)?.[0] ?? "";
    expect(viewportBlock).toMatch(/inset:\s*0/);
    expect(viewportBlock).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
  });

  it("F — zero-backdrop token remains transparent", () => {
    expect(readGlobalsCss()).toContain("--sce-modal-backdrop: transparent;");
  });

  it("G — mobile shell zeroes effective sidebar width for overlay geometry", () => {
    const css = readGlobalsCss();
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*--sce-sidebar-effective-width:\s*0px/);
  });
});
