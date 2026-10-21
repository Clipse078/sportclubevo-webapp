import { describe, expect, it } from "vitest";
import { computeOrgLayoutBoundingBox } from "@/lib/org/org-layout-bounds";

describe("org-layout-bounds", () => {
  it("includes negative manual offsets in complete bounds", () => {
    const box = computeOrgLayoutBoundingBox([
      { x: -120, y: 40, width: 240, height: 88 },
      { x: 300, y: 200, width: 240, height: 88 },
    ]);
    expect(box.minX).toBeLessThan(0);
    expect(box.width).toBeGreaterThan(420);
    expect(box.height).toBeGreaterThan(200);
  });
});
