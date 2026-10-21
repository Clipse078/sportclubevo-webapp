import { describe, expect, it } from "vitest";
import {
  expandCollapsedAncestors,
  mergeLayoutWithManualPositions,
} from "@/lib/org/org-layout-persistence";
import type { OrgHierarchyLayoutNode } from "@/lib/org/org-hierarchy-layout";

describe("org-layout-persistence", () => {
  it("merges manual absolute positions over auto layout", () => {
    const auto: OrgHierarchyLayoutNode[] = [
      { id: "a", x: 10, y: 20, width: 200, height: 68, depth: 0 },
      { id: "b", x: 300, y: 20, width: 200, height: 68, depth: 0 },
    ];
    const merged = mergeLayoutWithManualPositions(auto, { a: { x: 50, y: 80 } });
    expect(merged.find((n) => n.id === "a")?.x).toBe(50);
    expect(merged.find((n) => n.id === "b")?.x).toBe(300);
  });

  it("expands collapsed ancestors for search focus", () => {
    const units = [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
      { id: "leaf", parentId: "child" },
    ];
    const next = expandCollapsedAncestors("leaf", units, new Set(["root", "child"]));
    expect(next.has("root")).toBe(false);
    expect(next.has("child")).toBe(false);
  });
});
