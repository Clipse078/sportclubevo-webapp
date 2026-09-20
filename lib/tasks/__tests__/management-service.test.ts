/**
 * AUFGABEN-02 — management query visibility and tenant scoping.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listTaskManagementItems,
  listTaskSeriesManagementRows,
} from "../management-service";
import { parseTaskManagementQuery } from "../management-navigation";

const mocks = vi.hoisted(() => ({
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  taskSeriesFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
    },
    taskSeries: {
      findMany: mocks.taskSeriesFindMany,
    },
  },
}));

const TENANT_A = "tenant-a";
const USER_ASSIGNEE = "user-assignee";
const USER_MANAGER = "user-manager";

function assigneeCtx() {
  return {
    tenantId: TENANT_A,
    userId: USER_ASSIGNEE,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
  };
}

function managerCtx() {
  return {
    tenantId: TENANT_A,
    userId: USER_MANAGER,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
  };
}

function viewAllCtx() {
  return {
    tenantId: TENANT_A,
    userId: USER_MANAGER,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
  };
}

describe("AUFGABEN-02 management listTaskManagementItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskCount.mockResolvedValue(0);
    mocks.taskFindMany.mockResolvedValue([]);
  });

  it("always composes canonical visibility with view filters", async () => {
    const query = parseTaskManagementQuery({ view: "ALLE" });
    await listTaskManagementItems(assigneeCtx(), query, "Europe/Zurich");

    expect(mocks.taskCount).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            tenantId: TENANT_A,
            OR: [
              { createdByUserId: USER_ASSIGNEE },
              {
                assignees: {
                  some: { userId: USER_ASSIGNEE, tenantId: TENANT_A },
                },
              },
            ],
          },
          { parentTaskId: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
          { status: { in: ["OPEN", "IN_PROGRESS"] } },
        ],
      },
    });
  });

  it("scopes ERLEDIGT to completed root tasks within visibility", async () => {
    const query = parseTaskManagementQuery({ view: "ERLEDIGT" });
    await listTaskManagementItems(assigneeCtx(), query, "Europe/Zurich");

    expect(mocks.taskCount).toHaveBeenCalledWith({
      where: {
        AND: [
          expect.objectContaining({ tenantId: TENANT_A }),
          { status: "DONE", parentTaskId: null },
        ],
      },
    });
  });
});

describe("AUFGABEN-02 management listTaskSeriesManagementRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([]);
  });

  it("restricts recurring series for non-managers to visible relationships", async () => {
    const query = parseTaskManagementQuery({ view: "WIEDERKEHREND" });
    await listTaskSeriesManagementRows(assigneeCtx(), query);

    expect(mocks.taskSeriesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tenantId: TENANT_A },
            {
              OR: [
                { createdByUserId: USER_ASSIGNEE },
                {
                  assigneeTemplates: {
                    some: { userId: USER_ASSIGNEE, tenantId: TENANT_A },
                  },
                },
                {
                  occurrences: {
                    some: {
                      tenantId: TENANT_A,
                      OR: [
                        { createdByUserId: USER_ASSIGNEE },
                        {
                          assignees: {
                            some: {
                              userId: USER_ASSIGNEE,
                              tenantId: TENANT_A,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      }),
    );
  });

  it("allows tenant-wide series listing for tasks.manage", async () => {
    const query = parseTaskManagementQuery({ view: "WIEDERKEHREND" });
    await listTaskSeriesManagementRows(managerCtx(), query);

    expect(mocks.taskSeriesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ tenantId: TENANT_A }] },
      }),
    );
  });

  it("allows tenant-wide series listing for tasks.view_all", async () => {
    const query = parseTaskManagementQuery({ view: "WIEDERKEHREND" });
    await listTaskSeriesManagementRows(viewAllCtx(), query);

    expect(mocks.taskSeriesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ tenantId: TENANT_A }] },
      }),
    );
  });
});
