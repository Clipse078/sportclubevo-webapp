/**
 * @vitest-environment jsdom
 *
 * SCE modal backdrop — dimmed scrim with backdrop blur (PLANNING-UX-07R8A).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function backdropBlock(css: string): string {
  const match = css.match(/\.sce-modal-overlay-backdrop\s*\{[^}]+\}/);
  expect(match).not.toBeNull();
  return match![0];
}

describe("SceModalOverlay backdrop SCE-RESPONSIVE-01F", () => {
  it("A — uses exactly one canonical visual backdrop on the overlay layer", () => {
    const overlaySource = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlaySource.match(/sce-modal-overlay-backdrop/g)?.length).toBe(1);

    render(
      <SceModalOverlay open testId="backdrop-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const overlay = screen.getByTestId("backdrop-overlay");
    expect(overlay.querySelectorAll(".sce-modal-overlay-backdrop")).toHaveLength(1);
  });

  it("B — backdrop uses shared dimmed semantic token", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-modal-backdrop: rgb(2 6 15 / 42%);");
    expect(css).toMatch(
      /\.sce-modal-overlay-backdrop\s*\{[\s\S]*background:\s*var\(--sce-modal-backdrop\)/,
    );
  });

  it("C — interaction layer covers full viewport root (transparent hit target)", () => {
    const css = readGlobalsCss();
    const block = backdropBlock(css);
    expect(block).toMatch(/position:\s*absolute/);
    expect(block).toMatch(/inset:\s*0/);
    const rootBlock = css.match(/\.sce-modal-overlay-root\s*\{[^}]+\}/)?.[0] ?? "";
    expect(rootBlock).toMatch(/inset:\s*0/);
    expect(rootBlock).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);

    render(
      <SceModalOverlay open testId="viewport-backdrop">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const root = screen.getByTestId("viewport-backdrop");
    expect(root.classList.contains("sce-modal-overlay-root")).toBe(true);
    expect(root.querySelector(".sce-modal-overlay-interaction-layer")).toBeTruthy();
  });

  it("D — applies canonical backdrop blur on the scrim", () => {
    const block = backdropBlock(readGlobalsCss());
    expect(block).toMatch(/backdrop-filter:\s*blur\(10px\)/);
  });

  it("E — data-sce-modal-background does not receive visual opacity or filter in CSS", () => {
    const css = readGlobalsCss();
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*opacity/);
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*filter/);
    expect(css).not.toMatch(/\[inert\][\s\S]*opacity/);
  });

  it("F — modal background roots become aria-hidden while open", () => {
    const root = document.createElement("div");
    root.setAttribute("data-sce-modal-background", "");
    document.body.appendChild(root);

    const { unmount } = render(
      <SceModalOverlay open testId="inert-backdrop">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    expect(root.getAttribute("aria-hidden")).toBe("true");

    unmount();
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    root.remove();
  });

  it("G — shared Dialog composes SceModalOverlay", () => {
    const dialogSource = readSource("components/ui/Dialog.tsx");
    expect(dialogSource).toContain("SceModalOverlay");
    expect(dialogSource).toMatch(/<SceModalOverlay[\s\S]*open=\{open\}/);
  });

  it("H — stationary modal architecture remains on SceModalOverlay (portal only, no scroll lock)", () => {
    const overlaySource = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlaySource).toContain("createPortal");
    expect(overlaySource).not.toContain("lockSceDocumentScroll");
    expect(overlaySource).toContain("[data-sce-modal-background]");
  });

  it("I — backdrop token stays within canonical dim range", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-modal-backdrop: rgb(2 6 15 / 42%);");
    expect(css).not.toMatch(/\.sce-modal-overlay-backdrop[\s\S]*rgb\(0 0 0 \/ 65%\)/);
  });
});
