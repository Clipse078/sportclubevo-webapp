import { describe, expect, it } from "vitest";
import {
  computeOrgUnitPreviewPlacement,
  SCE_ORG_UNIT_PREVIEW_WIDTH_PX,
} from "@/lib/org/org-unit-preview-placement";

describe("computeOrgUnitPreviewPlacement", () => {
  it("flips placement near viewport right edge and respects inspector inset", () => {
    const placement = computeOrgUnitPreviewPlacement({
      anchor: { top: 200, left: 900, right: 1100, bottom: 280, width: 200, height: 80 },
      viewportWidth: 1200,
      viewportHeight: 800,
      previewWidth: SCE_ORG_UNIT_PREVIEW_WIDTH_PX,
      chromeInsets: { top: 52, right: 352 },
    });
    expect(placement.placement).toBe("left");
    expect(placement.left).toBeLessThan(900);
  });

  it("keeps preview within viewport vertical bounds", () => {
    const placement = computeOrgUnitPreviewPlacement({
      anchor: { top: 10, left: 100, right: 300, bottom: 90, width: 200, height: 80 },
      viewportWidth: 1000,
      viewportHeight: 600,
      chromeInsets: { top: 52, bottom: 16 },
    });
    expect(placement.top).toBeGreaterThanOrEqual(52);
  });
});
