import { describe, expect, it } from "vitest";
import {
  computeOrgCanvasFitToView,
  getOrgContextualZoomLevel,
  ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
  ORG_CANVAS_DEFAULT_NODE_WIDTH,
  ORG_CANVAS_NODE_NAME_FONT_PX,
  ORG_CANVAS_LEGIBLE_MIN_NAME_PX,
  orgCanvasReadableMinScale,
} from "@/lib/org/org-canvas-viewport";
import {
  filterValidReparentTargets,
  wouldReparentCreateCycle,
} from "@/lib/org/org-hierarchy-layout";

describe("org-canvas-viewport", () => {
  it("accounts for chrome insets and content bounds when fitting (fitAll)", () => {
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
      mode: "fitAll",
    });
    expect(result.scale).toBeGreaterThan(0);
    expect(result.panX).toBeLessThan(200);
  });

  it("fitAll shrinks to show entire hierarchy even when names become small", () => {
    const result = computeOrgCanvasFitToView({
      viewportWidth: 800,
      viewportHeight: 600,
      layoutWidth: 4000,
      layoutHeight: 3000,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      legibleMinScreenNodeWidth: ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
      mode: "fitAll",
    });
    expect(result.scale * ORG_CANVAS_DEFAULT_NODE_WIDTH).toBeLessThan(
      ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
    );
    expect(result.hierarchyOverflowsViewport).toBe(false);
  });

  it("initial framing keeps readable scale and top-aligns without width-driven shrink", () => {
    const wide = computeOrgCanvasFitToView({
      viewportWidth: 900,
      viewportHeight: 680,
      layoutWidth: 3200,
      layoutHeight: 420,
      contentWidth: 2800,
      contentHeight: 380,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      mode: "initial",
    });
    const readable = orgCanvasReadableMinScale();
    expect(wide.scale).toBeGreaterThanOrEqual(readable - 0.01);
    expect(wide.scale * ORG_CANVAS_NODE_NAME_FONT_PX).toBeGreaterThanOrEqual(
      ORG_CANVAS_LEGIBLE_MIN_NAME_PX - 0.5,
    );
    expect(wide.legibilityClamped).toBe(true);
    expect(wide.hierarchyOverflowsViewport).toBe(true);
    expect(wide.panY).toBeLessThan(160);
  });

  it("initial framing uses height slack without forced zoom-in when already readable", () => {
    const result = computeOrgCanvasFitToView({
      viewportWidth: 1200,
      viewportHeight: 800,
      layoutWidth: 1200,
      layoutHeight: 400,
      contentWidth: 720,
      contentHeight: 320,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      legibleMinScreenNodeWidth: ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
      mode: "initial",
    });
    expect(result.legibilityClamped).toBe(false);
    expect(result.hierarchyOverflowsViewport).toBe(false);
    expect(result.scale).toBeGreaterThanOrEqual(orgCanvasReadableMinScale() - 0.02);
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