import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeOrgCanvasFitToView,
  orgCanvasReadableMinScale,
} from "@/lib/org/org-canvas-viewport";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-ORG-WORKSPACE-02 organisation canvas workspace", () => {
  it("separates initial readable framing from explicit fit-all", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain('applyFitToView("initial")');
    expect(canvas).toContain('applyFitToView("fitAll")');
    expect(canvas).toContain("mode:");
    expect(canvas).toContain("ORG_CANVAS_FIT_CHROME_INSETS");
    const fitBlock =
      canvas.match(/const applyFitToView = useCallback\([\s\S]*?\n  \);/)?.[0] ?? "";
    expect(fitBlock).toContain("ORG_CANVAS_FIT_CHROME_INSETS");
    expect(fitBlock).not.toContain("ORG_INSPECTOR_INSET_PX");
  });

  it("renders layout and connectors in normalised content coordinates", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("layoutNodesInContent");
    expect(canvas).toContain("contentOriginX");
    expect(canvas).toContain("boundsMinX: 0");
  });

  it("exposes keyboard- and hover-accessible full organisation names", () => {
    const card = readSrc("components/admin/org/OrgUnitNodeCard.tsx");
    expect(card).toContain('role="tooltip"');
    expect(card).toContain("aria-describedby");
    expect(card).toContain("group-focus-within/org-node:block");
  });

  it("does not reset viewport when search is cleared", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    const searchEffect = canvas.match(
      /useEffect\(\(\) => \{\n    if \(!searchQuery\.trim\(\)\) return;[\s\S]*?\n  \}, \[searchQuery[^\]]*\]\);/,
    )?.[0];
    expect(searchEffect).toBeTruthy();
    expect(searchEffect).toContain("if (!searchQuery.trim()) return");
    expect(searchEffect).not.toContain("applyFitToView");
  });

  it("search focus uses readable minimum scale", () => {
    const canvas = readSrc("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).toContain("orgCanvasReadableMinScale");
    const readable = orgCanvasReadableMinScale();
    const focused = computeOrgCanvasFitToView({
      viewportWidth: 1100,
      viewportHeight: 700,
      layoutWidth: 2600,
      layoutHeight: 520,
      contentWidth: 2400,
      contentHeight: 480,
      mode: "initial",
    });
    expect(focused.scale).toBeGreaterThanOrEqual(readable - 0.01);
  });
});