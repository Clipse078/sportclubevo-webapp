import { describe, expect, it } from "vitest";
import { computeUnplannedListReorder } from "../umsetzungsplanung-dnd";

describe("computeUnplannedListReorder", () => {
  const rows = [
    { taskId: "t1", title: "A" },
    { taskId: "t2", title: "A" },
    { taskId: "t3", title: "B" },
  ];

  it("moves a row to a lower index immediately", () => {
    const next = computeUnplannedListReorder(rows, "t3", 0);
    expect(next?.map((r) => r.taskId)).toEqual(["t3", "t1", "t2"]);
  });

  it("returns null when the order is unchanged", () => {
    expect(computeUnplannedListReorder(rows, "t1", 0)).toBeNull();
    expect(computeUnplannedListReorder(rows, "t2", 2)).toBeNull();
  });
});