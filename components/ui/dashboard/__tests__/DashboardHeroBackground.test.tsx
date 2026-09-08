/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHeroBackground } from "@/components/ui/dashboard/DashboardHeroBackground";
import { DEFAULT_HERO_TRANSFORM } from "@/lib/dashboard/dashboard-hero-position";

const onTransformChange = vi.fn();

beforeEach(() => {
  onTransformChange.mockReset();

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  class ResizeObserverMock {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(element: Element) {
      this.callback(
        [
          {
            contentRect: {
              width: 800,
              height: 200,
              top: 0,
              left: 0,
              bottom: 200,
              right: 800,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
            target: element,
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      );
    }

    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardHeroBackground", () => {
  it("starts drag on pointerdown and updates transform on pointermove", async () => {
    render(
      <DashboardHeroBackground
        imageUrl="https://cdn.example/hero.jpg"
        transform={DEFAULT_HERO_TRANSFORM}
        isEditing
        onTransformChange={onTransformChange}
      />,
    );

    const surface = screen.getByLabelText("Titelbild-Editor");
    const image = document.querySelector('img[src="https://cdn.example/hero.jpg"]') as HTMLImageElement;

    Object.defineProperty(image, "naturalWidth", { value: 1600, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 900, configurable: true });
    fireEvent.load(image);

    await waitFor(() => {
      expect(image.style.height).not.toBe("");
    });

    fireEvent.pointerDown(surface, { clientX: 100, clientY: 40, button: 0, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 100, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(surface, { pointerId: 1 });

    await waitFor(() => {
      expect(onTransformChange).toHaveBeenCalled();
    });
    const lastCall = onTransformChange.mock.calls.at(-1)?.[0];
    expect(lastCall.positionY).not.toBe(DEFAULT_HERO_TRANSFORM.positionY);
  });

  it("ignores drag starts on editor controls", () => {
    render(
      <>
        <DashboardHeroBackground
          imageUrl="https://cdn.example/hero.jpg"
          transform={DEFAULT_HERO_TRANSFORM}
          isEditing
          onTransformChange={onTransformChange}
        />
        <button type="button" data-hero-editor-control>
          control
        </button>
      </>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "control" }), {
      clientX: 50,
      clientY: 50,
      button: 0,
      pointerId: 2,
    });

    expect(onTransformChange).not.toHaveBeenCalled();
  });

  it("supports keyboard nudging while editing", () => {
    render(
      <DashboardHeroBackground
        imageUrl="https://cdn.example/hero.jpg"
        transform={DEFAULT_HERO_TRANSFORM}
        isEditing
        onTransformChange={onTransformChange}
      />,
    );

    const surface = screen.getByLabelText("Titelbild-Editor");
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    expect(onTransformChange).toHaveBeenCalledWith(
      expect.objectContaining({ positionX: expect.any(Number) }),
    );
  });
});
