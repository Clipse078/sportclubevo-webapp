import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  loadPersonalActionsModuleCapabilities: vi.fn(),
  countPersonalActions: vi.fn(),
  loadDashboardPersonalActions: vi.fn(),
}));

vi.mock("@/lib/personal-actions/access", () => ({
  loadPersonalActionsModuleCapabilities: mocks.loadPersonalActionsModuleCapabilities,
}));

vi.mock("@/lib/personal-actions", () => ({
  countPersonalActions: mocks.countPersonalActions,
  loadDashboardPersonalActions: mocks.loadDashboardPersonalActions,
}));

import {
  DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  loadDashboardPersonalTasks,
} from "@/lib/dashboard/personal-tasks-loader";

describe("AUFGABEN-05-UI — dashboard personal actions loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — personal inbox user gets PersonalAction count and preview", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 4,
      taskActionable: 2,
      attendanceActionable: 2,
    });
    mocks.loadDashboardPersonalActions.mockResolvedValue([
      {
        id: "pa-1",
        sourceType: "TASK",
        title: "Overdue item",
        subtitle: null,
        dueAt: "2026-01-01T12:00:00.000Z",
        href: "/dashboard/aufgaben/t1",
      },
    ]);

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(4);
    expect(snapshot.preview).toHaveLength(1);
    expect(mocks.loadDashboardPersonalActions).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        userId: "user-a",
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      }),
    );
  });

  it("K — parent without tasks.view still authorized via participation capability", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 2,
      taskActionable: 0,
      attendanceActionable: 2,
    });
    mocks.loadDashboardPersonalActions.mockResolvedValue([]);

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "parent-user",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(2);
  });

  it("D — user without supported capability is unauthorized", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: false,
      permissionKeys: [PERMISSIONS.EVENTS_MANAGE],
    });

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot).toEqual({ authorized: false, count: null, preview: [] });
    expect(mocks.countPersonalActions).not.toHaveBeenCalled();
    expect(mocks.loadDashboardPersonalActions).not.toHaveBeenCalled();
  });

  it("E — tenant isolation uses explicit tenantId", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 0,
      taskActionable: 0,
      attendanceActionable: 0,
    });
    mocks.loadDashboardPersonalActions.mockResolvedValue([]);

    await loadDashboardPersonalTasks({
      tenantId: "tenant-b",
      userId: "user-a",
    });

    expect(mocks.loadPersonalActionsModuleCapabilities).toHaveBeenCalledWith({
      tenantId: "tenant-b",
      userId: "user-a",
    });
    expect(mocks.loadDashboardPersonalActions).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b" }),
    );
  });

  it("uses dashboard preview limit from personal-actions foundation", () => {
    expect(DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT).toBe(5);
  });
});
