/**
 * @vitest-environment jsdom
 */
import { useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
function PlannerScrollFixture() {
  return (
    <div data-sce-modal-background>
      <div
        data-sce-planner-scroll-root
        data-testid="planner-scroll"
        style={{ overflow: "auto", height: 200 }}
      >
        <div style={{ height: 800 }}>Planner</div>
      </div>
      <div
        data-sce-planner-calendar-scroll-root
        data-testid="calendar-scroll"
        style={{ overflow: "auto", width: 200 }}
      >
        <div style={{ width: 800 }}>Calendar</div>
      </div>
    </div>
  );
}

function ModalWithTitle({ open }: { open: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <PlannerScrollFixture />
      <SceModalOverlay open={open} testId="scroll-overlay" initialFocusRef={titleRef}>
        <div role="dialog" aria-modal="true">
          <h2 ref={titleRef} tabIndex={-1}>
            Modal title
          </h2>
        </div>
      </SceModalOverlay>
    </>
  );
}

describe("SceModalOverlay scroll preservation SCE-RESPONSIVE-01K", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "scrollY", { value: 1200, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  });

  it("keeps window and planner scroll positions after open and close", async () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation((x, y) => {
      if (typeof x === "number") window.scrollY = y ?? window.scrollY;
    });

    const { rerender } = render(<ModalWithTitle open={false} />);

    const planner = screen.getByTestId("planner-scroll");
    const calendar = screen.getByTestId("calendar-scroll");
    planner.scrollTop = 940;
    calendar.scrollLeft = 420;

    rerender(<ModalWithTitle open />);

    await waitFor(() => {
      expect(screen.getByTestId("scroll-overlay")).toBeInTheDocument();
    });

    expect(window.scrollY).toBe(1200);
    expect(planner.scrollTop).toBe(940);
    expect(calendar.scrollLeft).toBe(420);

    rerender(<ModalWithTitle open={false} />);

    expect(window.scrollY).toBe(1200);
    expect(planner.scrollTop).toBe(940);
    expect(calendar.scrollLeft).toBe(420);

    scrollToSpy.mockRestore();
  });

  it("applies inert only after moving focus into the modal", async () => {
    function InertOrderProbe({ open }: { open: boolean }) {
      const titleRef = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <div data-sce-modal-background data-testid="planner-background">
            <button type="button">Open</button>
          </div>
          <SceModalOverlay open={open} testId="inert-order" initialFocusRef={titleRef}>
            <h2 ref={titleRef} tabIndex={-1}>
              Title
            </h2>
          </SceModalOverlay>
        </>
      );
    }

    const { rerender } = render(<InertOrderProbe open={false} />);
    const background = screen.getByTestId("planner-background");
    const trigger = background.querySelector("button")!;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<InertOrderProbe open />);

    await waitFor(() => {
      expect(background.hasAttribute("inert")).toBe(true);
    });
    expect(document.activeElement?.textContent).toBe("Title");
  });
});
