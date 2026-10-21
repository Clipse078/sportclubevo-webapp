// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrgUnitContextualPreview } from "@/lib/org/use-org-unit-contextual-preview";

function mouseEnter(unitId: string) {
  return {
    pointerType: "mouse",
    anchor: { top: 0, left: 0, right: 100, bottom: 40, width: 100, height: 40 },
    element: document.createElement("div"),
  } as const;
}

describe("useOrgUnitContextualPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens after intentional hover delay and closes on Escape", () => {
    const { result } = renderHook(() =>
      useOrgUnitContextualPreview({ openDelayMs: 300, closeDelayMs: 100 }),
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a", {
        pointerType: "mouse",
        anchor: { top: 0, left: 0, right: 100, bottom: 40, width: 100, height: 40 },
        element: document.createElement("div"),
      });
    });
    expect(result.current.openUnitId).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.openUnitId).toBe("unit-a");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(result.current.openUnitId).toBeNull();
  });

  it("suppresses preview while node drag is active", () => {
    const { result, rerender } = renderHook(
      ({ suppressReason }) =>
        useOrgUnitContextualPreview({ openDelayMs: 0, suppressReason }),
      { initialProps: { suppressReason: "none" as const } },
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a", mouseEnter("unit-a"));
      vi.advanceTimersByTime(0);
    });
    expect(result.current.openUnitId).toBe("unit-a");

    rerender({ suppressReason: "node-drag" });
    expect(result.current.openUnitId).toBeNull();
  });

  it("does not open preview for the inspector-selected unit", () => {
    const { result } = renderHook(() =>
      useOrgUnitContextualPreview({
        openDelayMs: 0,
        selectedUnitId: "unit-a",
      }),
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a", mouseEnter("unit-a"));
      vi.advanceTimersByTime(0);
    });
    expect(result.current.openUnitId).toBeNull();

    act(() => {
      result.current.onNodePointerEnter("unit-b", mouseEnter("unit-b"));
      vi.advanceTimersByTime(0);
    });
    expect(result.current.openUnitId).toBe("unit-b");
  });

  it("stays open when pointer moves onto preview before close delay", () => {
    const { result } = renderHook(() =>
      useOrgUnitContextualPreview({ openDelayMs: 0, closeDelayMs: 200 }),
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a", mouseEnter("unit-a"));
      vi.advanceTimersByTime(0);
      result.current.onNodePointerLeave("unit-a");
      result.current.onPreviewPointerEnter();
      vi.advanceTimersByTime(200);
    });
    expect(result.current.openUnitId).toBe("unit-a");
  });

  it("ignores touch pointer for hover open", () => {
    const { result } = renderHook(() =>
      useOrgUnitContextualPreview({ openDelayMs: 0 }),
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a", {
        pointerType: "touch",
        anchor: mouseEnter("unit-a").anchor,
        element: document.createElement("div"),
      });
      vi.advanceTimersByTime(0);
    });
    expect(result.current.openUnitId).toBeNull();
  });
});
