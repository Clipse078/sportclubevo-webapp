import { describe, expect, it } from "vitest";
import {
  formatGoalAchievementCountLabel,
  type VereinsentwicklungProgressSnapshot,
} from "../vereinsentwicklung-workspace-progress";

describe("strategy goal achievement presentation", () => {
  it("formats x von y Ziele erreicht", () => {
    const snap: VereinsentwicklungProgressSnapshot = {
      completedCount: 1,
      totalCount: 2,
      percent: 50,
      contributingTaskIds: [],
    };
    expect(formatGoalAchievementCountLabel(snap)).toBe("1 von 2 Zielen erreicht");
  });

  it("shows empty copy when no eligible goals", () => {
    expect(
      formatGoalAchievementCountLabel({
        completedCount: 0,
        totalCount: 0,
        percent: 0,
        contributingTaskIds: [],
      }),
    ).toBe("Noch keine Ziele");
  });
});