import { describe, expect, it } from "vitest";
import {
  computeOrgCanvasFitToView,
  getOrgContextualZoomLevel,
  ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
  ORG_CANVAS_DEFAULT_NODE_WIDTH,
} from "@/lib/org/org-canvas-viewport";
import { wouldReparentCreateCycle } from "@/lib/org/org-hierarchy-layout";

describe("org-canvas-viewport", () => {
  it("applies legibility guard when fit would shrink nodes too far", () => {
    const result = computeOrgCanvasFitToView({
      viewportWidth: 800,
      viewportHeight: 600,
      layoutWidth: 4000,
      layoutHeight: 3000,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      legibleMinScreenNodeWidth: ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
    });
    expect(result.scale * ORG_CANVAS_DEFAULT_NODE_WIDTH).toBeGreaterThanOrEqual(
      ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH - 1,
    );
    expect(result.legibilityClamped).toBe(true);
    expect(result.hierarchyOverflowsViewport).toBe(true);
  });

  it("classifies contextual zoom levels", () => {
    expect(getOrgContextualZoomLevel(1)).toBe("NORMAL");
    expect(getOrgContextualZoomLevel(0.7)).toBe("COMPACT");
    expect(getOrgContextualZoomLevel(0.4)).toBe("MICRO");
  });
});

describe("org canvas interaction contracts", () => {
  it("reparent cycle detection remains independent of layout positions", () => {
    const units = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    expect(wouldReparentCreateCycle(units, "a", "c")).toBe(true);
  });
});
