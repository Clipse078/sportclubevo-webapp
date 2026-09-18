/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01E — modal backdrop must preserve application context (not opaque black)
 * and must not duplicate dimming outside the portalled overlay layer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

describe("SceModalOverlay backdrop SCE-RESPONSIVE-01E", () => {
  it("uses one canonical semantic backdrop token on the overlay layer", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-modal-backdrop:");
    expect(css).toMatch(/\.sce-modal-overlay-backdrop\s*\{[\s\S]*background:\s*var\(--sce-modal-backdrop\)/);
    expect(css).not.toMatch(/\.sce-modal-overlay-backdrop[\s\S]*rgb\(0 0 0 \/ 65%\)/);
  });

  it("does not apply permanent dimming to ordinary admin shell roots", () => {
    const css = readGlobalsCss();
    expect(css).not.toMatch(/\[data-sce-modal-background\][\s\S]*opacity/);
    expect(css).not.toMatch(/\[inert\][\s\S]*opacity/);
  });

  it("renders exactly one backdrop element inside the portalled overlay", () => {
    render(
      <SceModalOverlay open testId="backdrop-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const overlay = screen.getByTestId("backdrop-overlay");
    expect(overlay.querySelectorAll(".sce-modal-overlay-backdrop")).toHaveLength(1);
  });
});
