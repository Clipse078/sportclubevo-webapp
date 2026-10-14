import { describe, expect, it } from "vitest";
import {
  isGuidedFinalReviewStep,
  resolveGuidedNextStep,
  resolveGuidedPreviousStep,
  resolveGuidedStepIndex,
  resolveGuidedStepVisualState,
} from "@/lib/sce/activity-composer/guided-workflow";

const ORDER = ["a", "b", "c", "d"] as const;

describe("SCE Guided Activity Composer workflow helpers", () => {
  it("resolves step index and neighbours", () => {
    expect(resolveGuidedStepIndex(ORDER, "b")).toBe(1);
    expect(resolveGuidedPreviousStep(ORDER, "a")).toBeNull();
    expect(resolveGuidedPreviousStep(ORDER, "c")).toBe("b");
    expect(resolveGuidedNextStep(ORDER, "c")).toBe("d");
    expect(resolveGuidedNextStep(ORDER, "d")).toBeNull();
  });

  it("marks visual states for progress UI", () => {
    expect(
      resolveGuidedStepVisualState({
        tabKey: "b",
        activeTab: "b",
        orderedTabKeys: ORDER,
      }),
    ).toBe("current");
    expect(
      resolveGuidedStepVisualState({
        tabKey: "a",
        activeTab: "c",
        orderedTabKeys: ORDER,
      }),
    ).toBe("unvisited");
    expect(
      resolveGuidedStepVisualState({
        tabKey: "a",
        activeTab: "c",
        orderedTabKeys: ORDER,
        reviewed: true,
        stepValid: true,
      }),
    ).toBe("completed");
    expect(
      resolveGuidedStepVisualState({
        tabKey: "a",
        activeTab: "c",
        orderedTabKeys: ORDER,
        stepComplete: true,
      }),
    ).toBe("completed");
    expect(
      resolveGuidedStepVisualState({
        tabKey: "d",
        activeTab: "b",
        orderedTabKeys: ORDER,
        tabErrors: { d: true },
      }),
    ).toBe("error");
  });

  it("detects final review step", () => {
    expect(
      isGuidedFinalReviewStep({ finalReviewTab: "d" }, "d"),
    ).toBe(true);
    expect(
      isGuidedFinalReviewStep({ finalReviewTab: "d" }, "b"),
    ).toBe(false);
  });
});
