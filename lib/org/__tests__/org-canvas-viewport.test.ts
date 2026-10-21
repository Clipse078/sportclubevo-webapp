import { describe, expect, it } from "vitest";
import {
  computeOrgCanvasFitToView,
  getOrgContextualZoomLevel,
  ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
  ORG_CANVAS_DEFAULT_NODE_WIDTH,
} from "@/lib/org/org-canvas-viewport";
import {
  filterValidReparentTargets,
  wouldReparentCreateCycle,
} from "@/lib/org/org-hierarchy-layout";

describe("org-canvas-viewport", () => {
  it("accounts for chrome insets and content bounds when fitting", () => {
    const result = computeOrgCanvasFitToView({
      viewportWidth: 1200,
      viewportHeight: 800,
      layoutWidth: 2000,
      layoutHeight: 1200,
      boundsMinX: -80,
      boundsMinY: 20,
      contentWidth: 900,
      contentHeight: 600,
      chromeInsets: { top: 52, right: 352 },
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
    });
    expect(result.scale).toBeGreaterThan(0);
    expect(result.panX).toBeLessThan(200);
  });

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
  it("filters valid reparent targets excluding descendants", () => {
    const units = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    const targets = filterValidReparentTargets(units, "a");
    expect(targets).not.toContain("a");
    expect(targets).not.toContain("b");
    expect(targets).not.toContain("c");
  });

  it("reparent cycle detection remains independent of layout positions", () => {
    const units = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    expect(wouldReparentCreateCycle(units, "a", "c")).toBe(true);
  });
});
