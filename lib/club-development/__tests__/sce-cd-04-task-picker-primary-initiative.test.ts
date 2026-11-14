import { describe, expect, it, vi, beforeEach } from "vitest";
import { DevelopmentSprintStatus, TaskContextType, TaskStatus } from "@prisma/client";
import { addTaskToSprint } from "../sprints/sprint-service";
import { classifySprintCloseTasks } from "../sprints/sprint-close-service";
import { sortInitiativeBacklogRows } from "../initiative-backlog";

const prismaMocks = vi.hoisted(() => ({
  developmentSprintFindFirst: vi.fn(),
  developmentSprintTaskMembershipFindFirst: vi.fn(),
  developmentSprintTaskMembershipCreate: vi.fn(),
  taskFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    developmentSprint: { findFirst: prismaMocks.developmentSprintFindFirst },
    developmentSprintTaskMembership: {
      findFirst: prismaMocks.developmentSprintTaskMembershipFindFirst,
      create: prismaMocks.developmentSprintTaskMembershipCreate,
    },
    task: { findFirst: prismaMocks.taskFindFirst },
  },
}));

describe("SCE-CD-04 task picker & primary initiative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects duplicate sprint membership", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-1",
      status: DevelopmentSprintStatus.PLANNED,
    });
    prismaMocks.taskFindFirst.mockResolvedValue({
      id: "task-1",
      contextType: TaskContextType.MATCH,
      contextId: "match-1",
    });
    prismaMocks.developmentSprintTaskMembershipFindFirst.mockResolvedValue({ id: "mem-existing" });

    await expect(addTaskToSprint("tenant-1", "sprint-1", "task-1")).rejects.toThrow(
      "Aufgabe ist bereits im Sprint.",
    );
    expect(prismaMocks.developmentSprintTaskMembershipCreate).not.toHaveBeenCalled();
  });

  it("treats cancelled tasks as unfinished on sprint close without cloning", () => {
    const report = classifySprintCloseTasks([
      { taskId: "done", status: TaskStatus.DONE },
      { taskId: "cancelled", status: TaskStatus.CANCELLED },
    ]);
    expect(report.finished).toHaveLength(1);
    expect(report.unfinished).toHaveLength(1);
    expect(report.unfinished[0].taskId).toBe("cancelled");
  });

  it("keeps durable backlog ordering by priority then updatedAt", () => {
    const sorted = sortInitiativeBacklogRows([
      { id: "low", backlogPriority: 0, updatedAt: new Date("2026-11-10") },
      { id: "high-old", backlogPriority: 10, updatedAt: new Date("2026-11-01") },
      { id: "high-new", backlogPriority: 10, updatedAt: new Date("2026-11-12") },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["high-new", "high-old", "low"]);
  });
});