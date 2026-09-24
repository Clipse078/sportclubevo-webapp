import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  loadPersonalActionsModuleCapabilities: vi.fn(),
  countPersonalActions: vi.fn(),
  loadPersonalActions: vi.fn(),
}));

vi.mock("@/lib/personal-actions/access", () => ({
  loadPersonalActionsModuleCapabilities: mocks.loadPersonalActionsModuleCapabilities,
}));

vi.mock("@/lib/personal-actions", () => ({
  countPersonalActions: mocks.countPersonalActions,
  loadPersonalActions: mocks.loadPersonalActions,
}));

import { loadDashboardPersonalWork } from "../load-dashboard-personal-work";

describe("DASHBOARD-05 — loadDashboardPersonalWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("C — authorized without personal assignment yields empty attention", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: false,
      permissionKeys: [PERMISSIONS.REGISTRATIONS_MANAGE],
    });

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "admin-user",
    });

    expect(work.attention).toEqual({
      authorized: false,
      items: [],
      totalCount: 0,
      viewAllHref: null,
    });
    expect(work.tasks.authorized).toBe(false);
    expect(mocks.loadPersonalActions).not.toHaveBeenCalled();
  });

  it("A — surfaces urgent tasks and obligations; preview excludes attention tasks", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 3,
      taskActionable: 2,
      attendanceActionable: 1,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([
      {
        id: "task:overdue",
        sourceType: "TASK",
        sourceId: "overdue",
        title: "Overdue task",
        subtitle: null,
        dueAt: "2026-09-20T08:00:00.000Z",
        status: "ACTIONABLE",
        href: "/dashboard/aufgaben/overdue",
        actionKind: "TASK",
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
      {
        id: "task:later",
        sourceType: "TASK",
        sourceId: "later",
        title: "Later task",
        subtitle: null,
        dueAt: "2026-10-01T08:00:00.000Z",
        status: "ACTIONABLE",
        href: "/dashboard/aufgaben/later",
        actionKind: "TASK",
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
      {
        id: "participation:p1",
        sourceType: "ATTENDANCE_RESPONSE",
        sourceId: null,
        title: "Training",
        subtitle: null,
        dueAt: null,
        status: "ACTIONABLE",
        href: "/dashboard/participation/x",
        actionKind: "PARTICIPATION_RESPONSE",
        context: { teamDisplayName: "F2" },
      },
    ]);

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "user-a",
      now: new Date("2026-09-24T12:00:00.000Z"),
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(work.attention.authorized).toBe(true);
    expect(work.attention.totalCount).toBe(2);
    expect(work.attention.items.map((i) => i.id)).toEqual(
      expect.arrayContaining(["task:overdue", "participation:p1"]),
    );
    expect(work.tasks.preview.map((p) => p.id)).toEqual(["task:later"]);
    expect(work.tasks.count).toBe(2);
  });

  it("E — tenant isolation passes tenantId to personal-actions", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 0,
      taskActionable: 0,
      attendanceActionable: 0,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([]);

    await loadDashboardPersonalWork({
      tenantId: "tenant-b",
      userId: "user-a",
    });

    expect(mocks.loadPersonalActions).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b", userId: "user-a" }),
    );
  });
});
