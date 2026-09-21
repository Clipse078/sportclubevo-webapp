/**
 * AUFGABEN-02B — scoped task visibility & RBAC security matrix.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskAccessGrantSubjectType, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskVisibilityWhere,
  canManageAllTasks,
  canViewAllTasks,
  canViewTaskRecord,
} from "../visibility";
import {
  getTaskManagementSummary,
  listTaskManagementItems,
  listTaskSeriesManagementRows,
} from "../management-service";
import {
  parseTaskManagementQuery,
  resolveTaskManagementQuery,
  sanitizeTaskManagementQuery,
  taskManagementViewsForScope,
} from "../management-navigation";
import { updateTask } from "../task-service";
import { TaskForbiddenError } from "../errors";

const mocks = vi.hoisted(() => ({
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  taskSeriesFindMany: vi.fn(),
}));

vi.mock("../context-presentation", () => ({
  resolveTaskContextsBatch: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
      findFirst: mocks.taskFindFirst,
      update: mocks.taskUpdate,
    },
    taskSeries: {
      findMany: mocks.taskSeriesFindMany,
    },
    tenantMembership: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

const TENANT_A = "tenant-a";
const USER = "user-trainer";
const OTHER = "user-other";

function ctx(permissionKeys: string[]) {
  return { tenantId: TENANT_A, userId: USER, permissionKeys };
}

describe("AUFGABEN-02B visibility primitives", () => {
  it("A — tasks.view only uses personal/relevant scope", () => {
    expect(canViewAllTasks(ctx([PERMISSIONS.TASKS_VIEW]))).toBe(false);
    expect(buildTaskVisibilityWhere(ctx([PERMISSIONS.TASKS_VIEW]))).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER },
        { assignees: { some: { userId: USER, tenantId: TENANT_A } } },
        {
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          accessGrants: {
            some: {
              tenantId: TENANT_A,
              subjectType: TaskAccessGrantSubjectType.USER,
              userId: USER,
            },
          },
        },
      ],
    });
  });

  it("B — tasks.view_all grants tenant-wide read without manage", () => {
    const viewAllCtx = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    expect(canViewAllTasks(viewAllCtx)).toBe(true);
    expect(canManageAllTasks(viewAllCtx)).toBe(false);
    expect(buildTaskVisibilityWhere(viewAllCtx)).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER },
        { assignees: { some: { userId: USER, tenantId: TENANT_A } } },
        { visibilityScope: TaskVisibilityScope.CLUB },
        {
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          accessGrants: {
            some: {
              tenantId: TENANT_A,
              subjectType: TaskAccessGrantSubjectType.USER,
              userId: USER,
            },
          },
        },
      ],
    });
  });

  it("C — tasks.manage includes tenant-wide visibility", () => {
    const manageCtx = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]);
    expect(canViewAllTasks(manageCtx)).toBe(true);
    expect(canManageAllTasks(manageCtx)).toBe(true);
  });

  it("E — cross-tenant records are never visible", () => {
    expect(
      canViewTaskRecord(ctx([PERMISSIONS.TASKS_VIEW_ALL]), {
        tenantId: "tenant-b",
        createdByUserId: USER,
        assigneeUserIds: [USER],
      }),
    ).toBe(false);
  });

  it("F — direct subtask assignment remains visible", () => {
    expect(
      canViewTaskRecord(ctx([PERMISSIONS.TASKS_VIEW]), {
        tenantId: TENANT_A,
        createdByUserId: OTHER,
        assigneeUserIds: [USER],
      }),
    ).toBe(true);
  });
});

describe("AUFGABEN-02B query manipulation", () => {
  it("G — ?view=all does not elevate personal scope", () => {
    const resolved = resolveTaskManagementQuery({ view: "alle" }, false);
    expect(resolved.view).toBe("MEINE");
    expect(resolved.assigneeUserId).toBeNull();
  });

  it("G — assignee filter stripped for personal users", () => {
    const sanitized = sanitizeTaskManagementQuery(
      parseTaskManagementQuery({ assignee: OTHER }, { tenantWideVisibility: false }),
      false,
    );
    expect(sanitized.assigneeUserId).toBeNull();
  });

  it("defaults MEINE for personal and ALLE for management", () => {
    expect(parseTaskManagementQuery({}, { tenantWideVisibility: false }).view).toBe("MEINE");
    expect(parseTaskManagementQuery({}, { tenantWideVisibility: true }).view).toBe("ALLE");
  });

  it("hides Alle perspective in UI scope list for personal users", () => {
    expect(taskManagementViewsForScope(false)).not.toContain("ALLE");
    expect(taskManagementViewsForScope(true)).toContain("ALLE");
  });
});

describe("AUFGABEN-02B management queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskCount.mockResolvedValue(0);
    mocks.taskFindMany.mockResolvedValue([]);
    mocks.taskSeriesFindMany.mockResolvedValue([]);
  });

  it("A — personal user cannot use tenant-wide ALLE view filters", async () => {
    const query = resolveTaskManagementQuery({ view: "ALLE" }, false);
    expect(query.view).toBe("MEINE");
    await listTaskManagementItems(ctx([PERMISSIONS.TASKS_VIEW]), query, "Europe/Zurich", "de-CH");

    const where = mocks.taskCount.mock.calls[0]![0].where;
    expect(where.AND[0]).toEqual(
      expect.objectContaining({
        tenantId: TENANT_A,
        OR: expect.any(Array),
      }),
    );
    expect(where.AND).not.toEqual(
      expect.arrayContaining([{ parentTaskId: null, status: { in: ["OPEN", "IN_PROGRESS"] } }]),
    );
  });

  it("B — view_all user sees tenant-wide ALLE roots", async () => {
    const query = parseTaskManagementQuery({ view: "ALLE" }, { tenantWideVisibility: true });
    await listTaskManagementItems(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
      query,
      "Europe/Zurich",
      "de-CH",
    );

    expect(mocks.taskCount).toHaveBeenCalledWith({
      where: {
        AND: [
          expect.objectContaining({
            tenantId: TENANT_A,
            OR: expect.arrayContaining([
              { visibilityScope: TaskVisibilityScope.CLUB },
            ]),
          }),
          { parentTaskId: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
          { status: { in: ["OPEN", "IN_PROGRESS"] } },
        ],
      },
    });
  });

  it("H — KPI counts use personal visibility for tasks.view only", async () => {
    mocks.taskCount.mockResolvedValueOnce(4).mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    const summary = await getTaskManagementSummary(
      ctx([PERMISSIONS.TASKS_VIEW]),
      "Europe/Zurich",
    );

    expect(summary.open).toBe(4);
    expect(mocks.taskCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.any(Array),
            }),
          ]),
        }),
      }),
    );
  });

  it("B — view_all lists tenant-wide recurring series", async () => {
    await listTaskSeriesManagementRows(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
      parseTaskManagementQuery({ view: "WIEDERKEHREND" }),
    );

    expect(mocks.taskSeriesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tenantId: TENANT_A },
            expect.objectContaining({
              OR: expect.arrayContaining([
                { visibilityScope: TaskVisibilityScope.CLUB },
              ]),
            }),
          ],
        },
      }),
    );
  });

  it("A — personal user series query stays scoped", async () => {
    await listTaskSeriesManagementRows(
      ctx([PERMISSIONS.TASKS_VIEW]),
      parseTaskManagementQuery({ view: "WIEDERKEHREND" }),
    );

    expect(mocks.taskSeriesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tenantId: TENANT_A },
            expect.objectContaining({ OR: expect.any(Array) }),
          ],
        },
      }),
    );
  });
});

describe("AUFGABEN-02B mutation vs view_all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("B — view_all alone does not authorize management mutations", async () => {
    mocks.taskFindFirst.mockResolvedValue({
      id: "t1",
      tenantId: TENANT_A,
      title: "X",
      description: null,
      status: "OPEN",
      priority: "NORMAL",
      dueAt: null,
      completedAt: null,
      contextType: null,
      contextId: null,
      parentTaskId: null,
      taskSeriesId: null,
      orgUnitId: null,
      visibilityScope: TaskVisibilityScope.CLUB,
      createdByUserId: OTHER,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignees: [],
    });

    await expect(
      updateTask(ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), "t1", {
        title: "Changed",
      }),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });
});
