import { describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import { computeParentTaskProgress } from "@/lib/tasks/task-hierarchy-progress";

describe("task-child-rollup progress rules", () => {
  it("exposes child rollup counts only when parent has eligible subtasks", () => {
    const withChildren = computeParentTaskProgress({
      parentStatus: TaskStatus.OPEN,
      subtasks: [{ status: TaskStatus.DONE }, { status: TaskStatus.OPEN }, { status: TaskStatus.OPEN }],
    });
    expect(withChildren.hasSubtasks).toBe(true);
    expect(withChildren.completedCount).toBe(1);
    expect(withChildren.totalCount).toBe(3);

    const leafOnly = computeParentTaskProgress({
      parentStatus: TaskStatus.OPEN,
      subtasks: [],
    });
    expect(leafOnly.hasSubtasks).toBe(false);
  });
});