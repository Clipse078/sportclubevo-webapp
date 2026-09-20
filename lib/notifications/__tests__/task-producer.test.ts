import { describe, expect, it } from "vitest";
import { computeNewAssigneeRows } from "../task-producer";

describe("computeNewAssigneeRows", () => {
  const at = new Date("2026-09-21T12:00:00.000Z");

  it("notifies only newly added assignees across assignment deltas", () => {
    expect(computeNewAssigneeRows([], ["A"], at).map((r) => r.userId)).toEqual(["A"]);
    expect(computeNewAssigneeRows(["A"], ["A"], at)).toEqual([]);
    expect(computeNewAssigneeRows(["A"], ["A", "B"], at).map((r) => r.userId)).toEqual(["B"]);
    expect(computeNewAssigneeRows(["A", "B"], ["B", "C"], at).map((r) => r.userId)).toEqual(["C"]);
    expect(computeNewAssigneeRows(["A", "B"], [], at)).toEqual([]);
    expect(computeNewAssigneeRows([], ["A", "B"], at).map((r) => r.userId)).toEqual(["A", "B"]);
  });
});
