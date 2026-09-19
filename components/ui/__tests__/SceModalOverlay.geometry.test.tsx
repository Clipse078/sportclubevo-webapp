/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { applyShellLayoutVarsToDocument } from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

describe("SceModalOverlay geometry SCE-RESPONSIVE-01B", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
      viewportWidthPx: 1536,
    });
  });

  it("portals to document.body and uses sidebar-inset content viewport class", () => {
    render(
      <SceModalOverlay open testId="overlay-test">
        <div data-testid="panel">Panel</div>
      </SceModalOverlay>,
    );

    const overlay = screen.getByTestId("overlay-test");
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay.classList.contains("sce-modal-overlay-root")).toBe(true);

    const viewport = overlay.querySelector(".sce-modal-overlay-content-viewport");
    expect(viewport).toBeTruthy();
    expect(viewport?.classList.contains("fixed")).toBe(false);
  });

  it("does not use viewport translate centering on the content viewport", () => {
    render(
      <SceModalOverlay open testId="overlay-test">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const viewport = screen
      .getByTestId("overlay-test")
      .querySelector(".sce-modal-overlay-content-viewport");
    expect(viewport?.className).not.toMatch(/translate-x|left-\[50%/);
  });
});
