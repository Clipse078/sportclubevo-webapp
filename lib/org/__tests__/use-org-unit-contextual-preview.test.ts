// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrgUnitContextualPreview } from "@/lib/org/use-org-unit-contextual-preview";

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
      result.current.onNodePointerEnter("unit-a");
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
      result.current.onNodePointerEnter("unit-a");
      vi.advanceTimersByTime(0);
    });
    expect(result.current.openUnitId).toBe("unit-a");

    rerender({ suppressReason: "node-drag" });
    expect(result.current.openUnitId).toBeNull();
  });

  it("stays open when pointer moves onto preview before close delay", () => {
    const { result } = renderHook(() =>
      useOrgUnitContextualPreview({ openDelayMs: 0, closeDelayMs: 200 }),
    );

    act(() => {
      result.current.onNodePointerEnter("unit-a");
      vi.advanceTimersByTime(0);
      result.current.onNodePointerLeave("unit-a");
      result.current.onPreviewPointerEnter();
      vi.advanceTimersByTime(200);
    });
    expect(result.current.openUnitId).toBe("unit-a");
  });
});
