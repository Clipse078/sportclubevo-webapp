import { describe, expect, it } from "vitest";
import {
  buildOrgHierarchyLayout,
  wouldReparentCreateCycle,
} from "@/lib/org/org-hierarchy-layout";

describe("org-hierarchy-layout", () => {
  it("lays out parent/child without overlap", () => {
    const units = [
      { id: "club", parentId: null, sortOrder: 0, name: "Club" },
      { id: "a", parentId: "club", sortOrder: 0, name: "A" },
      { id: "b", parentId: "club", sortOrder: 1, name: "B" },
    ];
    const layout = buildOrgHierarchyLayout(units, new Set());
    expect(layout.nodes).toHaveLength(3);
    expect(layout.edges).toHaveLength(2);
    const club = layout.nodes.find((n) => n.id === "club")!;
    const a = layout.nodes.find((n) => n.id === "a")!;
    const b = layout.nodes.find((n) => n.id === "b")!;
    expect(club.y).toBeLessThan(a.y);
    expect(club.y).toBeLessThan(b.y);
    expect(a.x).not.toBe(b.x);
  });

  it("respects collapsed branches", () => {
    const units = [
      { id: "club", parentId: null, sortOrder: 0, name: "Club" },
      { id: "a", parentId: "club", sortOrder: 0, name: "A" },
    ];
    const layout = buildOrgHierarchyLayout(units, new Set(["club"]));
    expect(layout.nodes.map((n) => n.id)).toEqual(["club"]);
    expect(layout.edges).toHaveLength(0);
  });

  it("detects reparent cycles client-side", () => {
    const units = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
    ];
    expect(wouldReparentCreateCycle(units, "a", "c")).toBe(true);
    expect(wouldReparentCreateCycle(units, "c", "a")).toBe(false);
    expect(wouldReparentCreateCycle(units, "b", "b")).toBe(true);
  });
});
