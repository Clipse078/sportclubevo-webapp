import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../visibility", () => ({
  loadAuthorizedParentTaskRefs: vi.fn().mockResolvedValue(new Map()),
}));

import { prisma } from "@/lib/db/prisma";
import {
  DASHBOARD_OPEN_TASK_CANDIDATE_CAP,
  listMyOpenTasksForPersonalActions,
} from "../my-open-tasks-personal-actions";

const ctx = {
  tenantId: "tenant-a",
  userId: "user-a",
  permissionKeys: [PERMISSIONS.TASKS_VIEW],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SCE-HOTFIX-LOGIN-01 R6 — listMyOpenTasksForPersonalActions", () => {
  it("uses minimal findMany (no TASK_AUTH_INCLUDE) and applies take limit", async () => {
    vi.mocked(prisma.task.count).mockResolvedValue(2);
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        id: "t1",
        title: "A",
        status: TaskStatus.OPEN,
        priority: "NORMAL",
        dueAt: new Date("2026-09-20T00:00:00.000Z"),
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        parentTaskId: null,
      },
      {
        id: "t2",
        title: "B",
        status: TaskStatus.IN_PROGRESS,
        priority: "HIGH",
        dueAt: new Date("2026-09-25T00:00:00.000Z"),
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        parentTaskId: null,
      },
    ]);

    const rows = await listMyOpenTasksForPersonalActions(ctx, {
      limit: 5,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].assignees).toEqual([]);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          title: true,
          dueAt: true,
          createdAt: true,
          parentTaskId: true,
        }),
      }),
    );
    expect(prisma.task.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.anything() }),
    );
  });

  it("bounds candidate load when open task count exceeds cap", async () => {
    vi.mocked(prisma.task.count).mockResolvedValue(DASHBOARD_OPEN_TASK_CANDIDATE_CAP + 50);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);

    await listMyOpenTasksForPersonalActions(ctx, {
      limit: 5,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });

    expect(prisma.task.findMany).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(prisma.task.findMany).mock.calls) {
      expect(call[0]?.take).toBeDefined();
    }
  });
});
