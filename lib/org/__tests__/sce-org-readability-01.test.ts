import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeOrgCanvasFitToView,
  ORG_CANVAS_DEFAULT_NODE_WIDTH,
  ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
} from "@/lib/org/org-canvas-viewport";
import { ORG_HIERARCHY_NODE_WIDTH } from "@/lib/org/org-hierarchy-layout";
import { SCE_SEARCH_FIELD_INPUT_CLASS } from "@/lib/design-system/sce-form-control-foundation";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-ORG-READABILITY-01", () => {
  it("uses the canonical search-input padding on the organigram toolbar", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("SCE_SEARCH_FIELD_INPUT_CLASS");
    expect(SCE_SEARCH_FIELD_INPUT_CLASS).toContain("fca-search-input");
    expect(canvas).not.toMatch(/className="fca-input w-full pl-9"/);
  });

  it("waits for measurable viewport geometry before the one-time initial fit", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("didInitialFit");
    expect(canvas).toContain("ResizeObserver");
    expect(canvas).toContain("clientWidth < 1");
  });

  it("allows wrapped organisation names before truncation in node cards", () => {
    const card = readSrc("components/admin/org/OrgUnitNodeCard.tsx");
    expect(card).toContain("line-clamp-2");
    expect(card).toContain("break-words");
    expect(card).toContain("title={unit.name}");
  });

  it("uses wider layout nodes for label legibility", () => {
    expect(ORG_HIERARCHY_NODE_WIDTH).toBeGreaterThanOrEqual(272);
    expect(ORG_CANVAS_DEFAULT_NODE_WIDTH).toBe(ORG_HIERARCHY_NODE_WIDTH);
  });

  it("keeps initial framing readable while fit-all may shrink for very large trees", () => {
    const fitsWithSlack = computeOrgCanvasFitToView({
      viewportWidth: 1280,
      viewportHeight: 720,
      layoutWidth: 1400,
      layoutHeight: 420,
      contentWidth: 880,
      contentHeight: 360,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      legibleMinScreenNodeWidth: ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
      mode: "initial",
    });
    expect(fitsWithSlack.legibilityClamped).toBe(false);
    expect(fitsWithSlack.hierarchyOverflowsViewport).toBe(false);

    const largeInitial = computeOrgCanvasFitToView({
      viewportWidth: 800,
      viewportHeight: 600,
      layoutWidth: 4000,
      layoutHeight: 3000,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      legibleMinScreenNodeWidth: ORG_CANVAS_LEGIBLE_MIN_SCREEN_NODE_WIDTH,
      mode: "initial",
    });
    expect(largeInitial.legibilityClamped).toBe(true);
    expect(largeInitial.hierarchyOverflowsViewport).toBe(true);

    const largeFitAll = computeOrgCanvasFitToView({
      viewportWidth: 800,
      viewportHeight: 600,
      layoutWidth: 4000,
      layoutHeight: 3000,
      nodeWidth: ORG_CANVAS_DEFAULT_NODE_WIDTH,
      mode: "fitAll",
    });
    expect(largeFitAll.hierarchyOverflowsViewport).toBe(false);
  });
});