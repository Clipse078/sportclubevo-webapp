import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  loadDashboardPersonalWork: vi.fn(),
}));

vi.mock("@/lib/dashboard/personal-attention", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboard/personal-attention")>();
  return {
    ...actual,
    loadDashboardPersonalWork: mocks.loadDashboardPersonalWork,
  };
});

import {
  DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
  loadDashboardPersonalTasks,
} from "@/lib/dashboard/personal-tasks-loader";

describe("AUFGABEN-05-UI — dashboard personal actions loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — personal inbox user gets PersonalAction count and preview", async () => {
    mocks.loadDashboardPersonalWork.mockResolvedValue({
      attention: { authorized: true, items: [], totalCount: 0, viewAllHref: "/dashboard/aufgaben?bereich=meine" },
      tasks: {
        authorized: true,
        count: 4,
        preview: [
          {
            id: "pa-1",
            title: "Overdue item",
            subtitle: null,
            metaLine: null,
            href: "/dashboard/aufgaben/t1",
            sourceLabel: "Aufgabe",
          },
        ],
      },
    });

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(4);
    expect(snapshot.preview).toHaveLength(1);
  });

  it("K — parent without tasks.view still authorized via participation capability", async () => {
    mocks.loadDashboardPersonalWork.mockResolvedValue({
      attention: { authorized: true, items: [], totalCount: 2, viewAllHref: null },
      tasks: { authorized: true, count: 0, preview: [] },
    });

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "parent-user",
    });

    expect(snapshot.authorized).toBe(true);
    expect(snapshot.count).toBe(0);
  });

  it("D — user without supported capability is unauthorized", async () => {
    mocks.loadDashboardPersonalWork.mockResolvedValue({
      attention: { authorized: false, items: [], totalCount: 0, viewAllHref: null },
      tasks: { authorized: false, count: null, preview: [] },
    });

    const snapshot = await loadDashboardPersonalTasks({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(snapshot).toEqual({ authorized: false, count: null, preview: [] });
  });

  it("E — tenant isolation uses explicit tenantId", async () => {
    mocks.loadDashboardPersonalWork.mockResolvedValue({
      attention: { authorized: true, items: [], totalCount: 0, viewAllHref: null },
      tasks: { authorized: true, count: 0, preview: [] },
    });

    await loadDashboardPersonalTasks({
      tenantId: "tenant-b",
      userId: "user-a",
    });

    expect(mocks.loadDashboardPersonalWork).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b", userId: "user-a" }),
    );
  });

  it("uses dashboard preview limit from personal-attention foundation", () => {
    expect(DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT).toBe(5);
  });
});
