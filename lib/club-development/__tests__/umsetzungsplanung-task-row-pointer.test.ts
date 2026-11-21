import { describe, expect, it } from "vitest";
import { exceedsUmsetzungsplanungTaskDragThreshold } from "../umsetzungsplanung-task-row-pointer";

describe("umsetzungsplanung task row pointer threshold", () => {
  it("requires at least five pixels of movement", () => {
    expect(exceedsUmsetzungsplanungTaskDragThreshold(0, 0, 4, 0)).toBe(false);
    expect(exceedsUmsetzungsplanungTaskDragThreshold(0, 0, 5, 0)).toBe(true);
  });
});