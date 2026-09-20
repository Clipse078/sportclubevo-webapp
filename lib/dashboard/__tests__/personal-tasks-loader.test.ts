import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getRequestEffectivePermissions: vi.fn(),
  countMyOpenTasks: vi.fn(),
  listMyTasks: vi.fn(),
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

vi.mock("@/lib/tasks/task-service", () => ({
  countMyOpenTasks: mocks.countMyOpenTasks,
  listMyTasks: mocks.listMyTasks,
}));

import {
  DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  loadDashboardPersonalTasks,
} from "@/lib/dashboard/personal-tasks-loader";

describe("AUFGABEN-04NB — dashboard personal tasks loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — tasks.view personal user gets count, preview, and authorization", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countMyOpenTasks.mockResolvedValue(2);
    mocks.listMyTasks.mockResolvedValue([
      {
        id: "t1",
        title: "Overdue item",
        dueAt: "2026-01-01T12:00:00.000Z",
        parentTask: null,
      },
    ]);

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(2);
    expect(snapshot.preview).toHaveLength(1);
    expect(mocks.listMyTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        userId: "user-a",
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      }),
      { openOnly: true, limit: DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT },
    );
  });

  it("B — tasks.view + tasks.view_all keeps personal scope (assignee count + listMyTasks)", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
    });
    mocks.countMyOpenTasks.mockResolvedValue(0);
    mocks.listMyTasks.mockResolvedValue([]);

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(0);
    expect(snapshot.preview).toEqual([]);
    expect(mocks.countMyOpenTasks).toHaveBeenCalledTimes(1);
    expect(mocks.listMyTasks).toHaveBeenCalledTimes(1);
  });

  it("C — tasks.manage still uses personal count and preview queries", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
    });
    mocks.countMyOpenTasks.mockResolvedValue(1);
    mocks.listMyTasks.mockResolvedValue([
      {
        id: "t9",
        title: "Personal only",
        dueAt: null,
        parentTask: { id: "p1", title: "Parent" },
      },
    ]);

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(1);
    expect(snapshot.preview[0]?.parentTitle).toBe("Parent");
  });

  it("D — user without tasks.view is unauthorized with no task data", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.EVENTS_MANAGE],
    });

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot).toEqual({ authorized: false, count: null, preview: [] });
    expect(mocks.countMyOpenTasks).not.toHaveBeenCalled();
    expect(mocks.listMyTasks).not.toHaveBeenCalled();
  });

  it("E — tenant isolation uses explicit tenantId in service context", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countMyOpenTasks.mockResolvedValue(0);
    mocks.listMyTasks.mockResolvedValue([]);

    await loadDashboardPersonalTasks({
      tenantId: "tenant-b",
      userId: "user-a",
    });

    expect(mocks.getRequestEffectivePermissions).toHaveBeenCalledWith("user-a", "tenant-b");
    expect(mocks.countMyOpenTasks).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b" }),
    );
  });
});
