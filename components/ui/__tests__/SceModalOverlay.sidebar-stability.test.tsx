/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01N — sidebar scrollTop must not mutate during modal open/close lifecycle.
 */
import { useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { SCE_SIDEBAR_SCROLL_ROOT_ATTR } from "@/lib/ui/sce-modal-background-scroll";

function installScrollTopWriteDetector(element: HTMLElement) {
  let value = 0;
  const writes: number[] = [];
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => value,
    set: (next: number) => {
      writes.push(next);
      value = next;
    },
  });
  return {
    set(next: number) {
      value = next;
    },
    writes,
  };
}

function ShellWithModal({ open }: { open: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <div data-sce-modal-background data-testid="admin-shell">
        <nav
          id="admin-sidebar-nav"
          data-sce-sidebar-scroll-root
          data-testid="sidebar-scroll"
          className="overflow-y-auto"
          style={{ height: 240 }}
        >
          <div style={{ height: 1200 }}>Nav</div>
        </nav>
        <button type="button">Trigger</button>
      </div>
      <SceModalOverlay open={open} testId="stability-overlay" initialFocusRef={titleRef}>
        <div role="dialog" aria-modal="true">
          <h2 ref={titleRef} tabIndex={-1}>
            Title
          </h2>
        </div>
      </SceModalOverlay>
    </>
  );
}

describe("SceModalOverlay sidebar stability SCE-RESPONSIVE-01N", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  });

  it.each([0, 375])(
    "sidebar scrollTop=%i — no scrollTop writes during open and close",
    async (initialScrollTop) => {
      const { rerender } = render(<ShellWithModal open={false} />);
      const sidebar = screen.getByTestId("sidebar-scroll");
      expect(sidebar).toHaveAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR);

      const detector = installScrollTopWriteDetector(sidebar);
      detector.set(initialScrollTop);

      rerender(<ShellWithModal open />);
      await waitFor(() => {
        expect(screen.getByTestId("stability-overlay")).toBeInTheDocument();
      });
      expect(detector.writes).toHaveLength(0);

      const shell = screen.getByTestId("admin-shell");
      expect(shell.getAttribute("aria-hidden")).toBe("true");
      expect(shell.hasAttribute("inert")).toBe(false);

      rerender(<ShellWithModal open={false} />);
      expect(detector.writes).toHaveLength(0);
      expect(shell.hasAttribute("aria-hidden")).toBe(false);
    },
  );

  it("marks background aria-hidden while open (not inert)", async () => {
    render(<ShellWithModal open />);
    await waitFor(() => {
      expect(screen.getByTestId("stability-overlay")).toBeInTheDocument();
    });
    const shell = screen.getByTestId("admin-shell");
    expect(shell.getAttribute("aria-hidden")).toBe("true");
    expect(shell.hasAttribute("inert")).toBe(false);
  });
});
