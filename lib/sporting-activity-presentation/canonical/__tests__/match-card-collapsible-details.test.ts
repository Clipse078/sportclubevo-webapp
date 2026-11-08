/**
 * SCE-DS2-04R3 — match card collapsible details primitives
 * @vitest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  sceMatchCardOperationalDetailsPanelId,
  useSceMatchCardCollapsibleDetails,
} from "../match-card-collapsible-details";

describe("match-card-collapsible-details", () => {
  it("builds stable panel ids from match identifiers", () => {
    expect(sceMatchCardOperationalDetailsPanelId("abc-123")).toBe(
      "sce-match-operational-details-abc-123",
    );
  });

  it("defaults to collapsed and toggles in uncontrolled mode", () => {
    const { result } = renderHook(() => useSceMatchCardCollapsibleDetails());
    expect(result.current.expanded).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);
    act(() => result.current.setExpanded(false));
    expect(result.current.expanded).toBe(false);
  });

  it("notifies controlled consumers without local persistence", () => {
    const onExpandedChange = vi.fn();
    const { result, rerender } = renderHook(
      (expanded: boolean) =>
        useSceMatchCardCollapsibleDetails({
          expanded,
          onExpandedChange,
        }),
      { initialProps: false },
    );

    act(() => result.current.toggle());
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(result.current.expanded).toBe(false);

    rerender(true);
    expect(result.current.expanded).toBe(true);
  });
});
