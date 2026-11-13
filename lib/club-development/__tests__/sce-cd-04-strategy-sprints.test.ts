import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskContextType, TaskStatus } from "@prisma/client";
import { sortInitiativeBacklogRows } from "../initiative-backlog";
import {
  computeMetricOutcomePercent,
  computeTargetOutcomePercent,
} from "../target-outcome-progress";
import {
  classifySprintCloseTasks,
  membershipIdsToSoftRemove,
} from "../sprints/sprint-close-service";
import { mapTaskStatusToBoardColumn } from "../sprints/sprint-board";
import { assertTaskInTenant } from "../sprints/sprint-service";

const prismaMocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: prismaMocks.taskFindFirst },
  },
}));

describe("SCE-CD-04 strategy & sprints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sorts backlog by backlogPriority desc then updatedAt desc", () => {
    const sorted = sortInitiativeBacklogRows([
      { id: "a", backlogPriority: 1, updatedAt: new Date("2026-01-02") },
      { id: "b", backlogPriority: 5, updatedAt: new Date("2026-01-01") },
      { id: "c", backlogPriority: 5, updatedAt: new Date("2026-01-03") },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("keeps outcome progress separate from delivery-oriented fields", () => {
    const outcome = computeTargetOutcomePercent([
      { targetValue: 100, currentValue: 40, direction: "INCREASE" },
      { targetValue: 50, currentValue: 25, direction: "INCREASE" },
    ]);
    expect(outcome).toBe(45);
    expect(computeMetricOutcomePercent({ targetValue: 0, currentValue: 1, direction: "INCREASE" })).toBeNull();
  });

  it("maps sprint board columns from task status without blocked column", () => {
    expect(mapTaskStatusToBoardColumn(TaskStatus.OPEN)).toBe("OPEN");
    expect(mapTaskStatusToBoardColumn(TaskStatus.IN_PROGRESS)).toBe("IN_PROGRESS");
    expect(mapTaskStatusToBoardColumn(TaskStatus.DONE)).toBe("DONE");
    expect(mapTaskStatusToBoardColumn(TaskStatus.CANCELLED)).toBe("OPEN");
  });

  it("classifies sprint close finished vs unfinished tasks", () => {
    const report = classifySprintCloseTasks([
      { taskId: "t1", status: TaskStatus.DONE },
      { taskId: "t2", status: TaskStatus.IN_PROGRESS },
    ]);
    expect(report.finished).toHaveLength(1);
    expect(report.unfinished).toHaveLength(1);
  });

  it("applies REMOVE disposition only to unfinished membership ids", () => {
    expect(membershipIdsToSoftRemove(["a", "b"], "KEEP")).toEqual([]);
    expect(membershipIdsToSoftRemove(["a", "b"], "REMOVE")).toEqual(["a", "b"]);
  });

  it("sprint membership does not require initiative task context", async () => {
    prismaMocks.taskFindFirst.mockResolvedValue({
      id: "task-1",
      contextType: TaskContextType.INITIATIVE,
      contextId: "init-1",
    });
    const task = await assertTaskInTenant("tenant-1", "task-1");
    expect(task.contextType).toBe(TaskContextType.INITIATIVE);
    expect(prismaMocks.taskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", tenantId: "tenant-1" },
      select: { id: true, contextType: true, contextId: true },
    });
  });

  it("rejects tasks outside tenant", async () => {
    prismaMocks.taskFindFirst.mockResolvedValue(null);
    await expect(assertTaskInTenant("tenant-1", "missing")).rejects.toThrow("Aufgabe nicht gefunden.");
  });
});
