import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteTaskPermanently } from "@/lib/tasks/task-delete-service";
import { ParentHasSubtasksForDeleteError } from "@/lib/tasks/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const requireVisibleTask = vi.fn();
const taskCount = vi.fn();
const taskDelete = vi.fn();
const membershipCount = vi.fn();

vi.mock("@/lib/tasks/task-access", () => ({
  requireVisibleTask: (...args: unknown[]) => requireVisibleTask(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      count: (...args: unknown[]) => taskCount(...args),
      delete: (...args: unknown[]) => taskDelete(...args),
    },
    developmentSprintTaskMembership: {
      count: (...args: unknown[]) => membershipCount(...args),
    },
  },
}));

describe("PKG-03 — task delete service (isolated fixtures)", () => {
  const ctx = {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: [PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_MANAGE],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks parent delete when subtasks remain", async () => {
    requireVisibleTask.mockResolvedValue({
      id: "parent-1",
      title: "Parent",
      tenantId: "tenant-1",
    });
    taskCount.mockResolvedValue(1);

    await expect(deleteTaskPermanently(ctx, "parent-1")).rejects.toBeInstanceOf(
      ParentHasSubtasksForDeleteError,
    );
    expect(taskDelete).not.toHaveBeenCalled();
  });

  it("deletes leaf task without cascading subtasks", async () => {
    requireVisibleTask.mockResolvedValue({
      id: "task-1",
      title: "Leaf",
      tenantId: "tenant-1",
    });
    taskCount.mockResolvedValue(0);
    membershipCount.mockResolvedValue(0);
    taskDelete.mockResolvedValue({ id: "task-1" });

    const result = await deleteTaskPermanently(ctx, "task-1");
    expect(taskDelete).toHaveBeenCalledWith({ where: { id: "task-1", tenantId: "tenant-1" } });
    expect(result?.taskId).toBe("task-1");
  });
});