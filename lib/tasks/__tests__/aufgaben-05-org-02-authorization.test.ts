/**
 * AUFGABEN-05-ORG-02 — organisational task authorization matrix.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskReadWhere,
  buildTaskSeriesReadWhere,
  canManageTask,
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
} from "../task-authorization";
import { getTaskManagementSummary } from "../management-service";
import { loadTaskDeadlineProjections } from "@/lib/personal-agenda/task-projections";

const mocks = vi.hoisted(() => ({
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
    },
    orgUnit: { findMany: vi.fn() },
    userRole: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
}));

const TENANT_A = "tenant-a";
const USER = "user-actor";
const OTHER = "user-other";
const ORG_FINANCE = "org-finance";
const ORG_SPORT = "org-sport";

function ctx(
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
) {
  return {
    tenantId: TENANT_A,
    userId: USER,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function taskRecord(overrides: Partial<Parameters<typeof canReadTask>[1]> = {}) {
  return {
    tenantId: TENANT_A,
    createdByUserId: OTHER,
    assigneeUserIds: [] as string[],
    visibilityScope: TaskVisibilityScope.CLUB,
    orgUnitId: null,
    ...overrides,
  };
}

describe("AUFGABEN-05-ORG-02 visibility matrix", () => {
  it("creator and assignee retain access for all scopes", () => {
    for (const scope of [
      TaskVisibilityScope.CLUB,
      TaskVisibilityScope.ORG_UNIT,
      TaskVisibilityScope.ASSIGNEES_ONLY,
    ]) {
      expect(
        canReadTask(ctx([PERMISSIONS.TASKS_VIEW]), taskRecord({
          visibilityScope: scope,
          createdByUserId: USER,
        })),
      ).toBe(true);
      expect(
        canReadTask(ctx([PERMISSIONS.TASKS_VIEW]), taskRecord({
          visibilityScope: scope,
          assigneeUserIds: [USER],
        })),
      ).toBe(true);
    }
  });

  it("tasks.view only cannot read unrelated confidential tasks", () => {
    expect(
      canReadTask(ctx([PERMISSIONS.TASKS_VIEW]), taskRecord({
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      })),
    ).toBe(false);
    expect(
      canReadTask(ctx([PERMISSIONS.TASKS_VIEW]), taskRecord({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      })),
    ).toBe(false);
  });

  it("tasks.view_all reads CLUB only, not confidential org/assignee scopes", () => {
    const viewAll = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    expect(
      canReadTask(viewAll, taskRecord({ visibilityScope: TaskVisibilityScope.CLUB })),
    ).toBe(true);
    expect(
      canReadTask(viewAll, taskRecord({
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      })),
    ).toBe(false);
    expect(
      canReadTask(viewAll, taskRecord({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      })),
    ).toBe(false);
  });

  it("org member reads ORG_UNIT tasks in owning unit", () => {
    expect(
      canReadTask(
        ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_FINANCE] }),
        taskRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
        }),
      ),
    ).toBe(true);
    expect(
      canReadTask(
        ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_SPORT] }),
        taskRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
        }),
      ),
    ).toBe(false);
  });

  it("scoped tasks.manage grants org read without membership", () => {
    expect(
      canReadTask(
        ctx([PERMISSIONS.TASKS_VIEW], {
          permissionReadOrgUnitIds: [ORG_FINANCE],
        }),
        taskRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
        }),
      ),
    ).toBe(true);
  });
});

describe("AUFGABEN-05-ORG-02 fail-closed corrupted org state", () => {
  it("ORG_UNIT with null orgUnitId grants no org-derived read", () => {
    expect(
      canReadTask(
        ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_FINANCE] }),
        taskRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: null,
        }),
      ),
    ).toBe(false);
  });

  it("foreign tenant task id never reads cross-tenant", () => {
    expect(
      canReadTask(ctx([PERMISSIONS.TASKS_VIEW_ALL]), {
        tenantId: "tenant-b",
        createdByUserId: USER,
        assigneeUserIds: [USER],
        visibilityScope: TaskVisibilityScope.CLUB,
        orgUnitId: null,
      }),
    ).toBe(false);
  });
});

describe("AUFGABEN-05-ORG-02 read vs manage separation", () => {
  it("org membership read does not imply manage", () => {
    const record = taskRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
    });
    const memberCtx = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {
      memberOrgUnitIds: [ORG_FINANCE],
    });
    expect(canReadTask(memberCtx, record)).toBe(true);
    expect(canManageTask(memberCtx, record)).toBe(false);
  });

  it("tenant-wide manage applies to CLUB tasks only", () => {
    const club = taskRecord({ visibilityScope: TaskVisibilityScope.CLUB });
    const org = taskRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
    });
    const manager = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]);
    expect(canManageTask(manager, club)).toBe(true);
    expect(canManageTask(manager, org)).toBe(false);
  });

  it("scoped manage applies within authorized org unit", () => {
    const org = taskRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
    });
    const scoped = ctx([PERMISSIONS.TASKS_VIEW], {
      permissionManageOrgUnitIds: [ORG_FINANCE],
      permissionReadOrgUnitIds: [ORG_FINANCE],
    });
    expect(canManageTask(scoped, org)).toBe(true);
  });
});

describe("AUFGABEN-05-ORG-02 query predicates", () => {
  it("view_all predicate includes CLUB branch only (not universal tenant filter)", () => {
    expect(buildTaskReadWhere(ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]))).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER },
        { assignees: { some: { userId: USER, tenantId: TENANT_A } } },
        { visibilityScope: TaskVisibilityScope.CLUB },
      ],
    });
  });

  it("org membership adds ORG_UNIT branch with tenant-safe org relation", () => {
    expect(
      buildTaskReadWhere(
        ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_FINANCE] }),
      ),
    ).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER },
        { assignees: { some: { userId: USER, tenantId: TENANT_A } } },
        {
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: { in: [ORG_FINANCE] },
          orgUnit: { tenantId: TENANT_A },
        },
      ],
    });
  });

  it("series read predicate mirrors task confidentiality semantics", () => {
    const where = buildTaskSeriesReadWhere(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
    );
    expect(where.tenantId).toBe(TENANT_A);
    expect(where.OR).toEqual(
      expect.arrayContaining([{ visibilityScope: TaskVisibilityScope.CLUB }]),
    );
    expect(where.OR).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ occurrences: expect.any(Object) }),
      ]),
    );
  });
});

describe("AUFGABEN-05-ORG-02 counts use authorized universe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskCount.mockResolvedValue(0);
  });

  it("view_all KPI counts cannot include confidential tasks implicitly", async () => {
    await getTaskManagementSummary(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
      "Europe/Zurich",
    );
    const firstCall = mocks.taskCount.mock.calls[0]![0].where;
    expect(firstCall.AND[0].OR).toEqual(
      expect.arrayContaining([{ visibilityScope: TaskVisibilityScope.CLUB }]),
    );
    expect(firstCall.AND[0]).not.toEqual({ tenantId: TENANT_A });
  });
});

describe("AUFGABEN-05-ORG-02 personal agenda remains assignee-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindMany.mockResolvedValue([]);
  });

  it("does not use buildTaskReadWhere / org visibility for agenda tasks", async () => {
    await loadTaskDeadlineProjections({
      tenantId: TENANT_A,
      userId: USER,
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-12-31"),
      tasksViewAuthorized: true,
    });

    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignees: { some: { userId: USER, tenantId: TENANT_A } },
        }),
      }),
    );
    expect(mocks.taskFindMany.mock.calls[0]![0].where.OR).toBeUndefined();
  });
});
