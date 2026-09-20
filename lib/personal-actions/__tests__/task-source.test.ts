import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: vi.fn(),
  countMyOpenTasks: vi.fn(),
}));

import { listMyTasks, countMyOpenTasks } from "@/lib/tasks/task-service";
import { taskPersonalActionSource } from "../sources/task-source";

const ctx = {
  tenantId: "tenant-a",
  userId: "user-a",
  permissionKeys: [PERMISSIONS.TASKS_VIEW],
  now: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AUFGABEN-05 — task PersonalAction source", () => {
  it("A — assigned OPEN task maps to TASK PersonalAction", async () => {
    vi.mocked(listMyTasks).mockResolvedValue([
      {
        id: "task-1",
        tenantId: "tenant-a",
        title: "Material mitbringen",
        description: null,
        status: TaskStatus.OPEN,
        priority: "NORMAL",
        dueAt: "2026-09-25T00:00:00.000Z",
        completedAt: null,
        contextType: null,
        contextId: null,
        parentTaskId: null,
        taskSeriesId: null,
        createdByUserId: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        assignees: [],
        parentTask: null,
      },
    ]);

    const actions = await taskPersonalActionSource.loadActionable(ctx);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: "task:task-1",
      sourceType: "TASK",
      sourceId: "task-1",
      actionKind: "TASK",
      href: "/dashboard/aufgaben/task-1",
      dueAt: "2026-09-25T00:00:00.000Z",
    });
    expect(listMyTasks).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-a", userId: "user-a" }),
      { openOnly: true },
    );
  });

  it("C — without tasks.view returns no actions and skips listMyTasks", async () => {
    const noPermCtx = { ...ctx, permissionKeys: [] as string[] };
    const actions = await taskPersonalActionSource.loadActionable(noPermCtx);
    expect(actions).toEqual([]);
    expect(listMyTasks).not.toHaveBeenCalled();
  });

  it("W — count uses countMyOpenTasks when authorized", async () => {
    vi.mocked(countMyOpenTasks).mockResolvedValue(3);
    const count = await taskPersonalActionSource.countActionable(ctx);
    expect(count).toBe(3);
  });
});
