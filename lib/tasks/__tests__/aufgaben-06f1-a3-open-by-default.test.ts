/**
 * AUFGABEN-06F1-A3 — open-by-default Task visibility on creation (A3-1 … A3-20).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TaskContextType,
  TaskStatus,
  TaskVisibilityScope,
} from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { buildTaskVisibilityWhere } from "../visibility";
import { createTaskWithContextDefaults } from "../contextual-task-create";
import { emitTaskAssignmentNotifications } from "@/lib/notifications/task-producer";
import { loadTaskDeadlineProjections } from "@/lib/personal-agenda/task-projections";
import {
  createQuickTask,
  createSubtask,
  createTask,
  listMyTasks,
} from "../task-service";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  taskAssigneeCreateMany: vi.fn(),
  auditCreate: vi.fn(),
  writeAuditRecord: vi.fn(),
  transaction: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
}));

vi.mock("@/lib/audit/audit-record", () => ({
  writeAuditRecord: mocks.writeAuditRecord,
}));

vi.mock("@/lib/notifications/task-producer", () => ({
  emitTaskAssignmentNotifications: vi.fn().mockResolvedValue(undefined),
  emitTaskDeadlineChangedNotifications: vi.fn().mockResolvedValue(undefined),
  computeNewAssigneeRows: (
    previousUserIds: string[],
    nextUserIds: string[],
    assignedAt: Date,
  ) =>
    nextUserIds
      .filter((userId) => !previousUserIds.includes(userId))
      .map((userId) => ({ userId, assignedAt })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    orgUnit: { findFirst: mocks.orgUnitFindFirst },
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      create: mocks.taskCreate,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    tenant: { findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich" }) },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const CREATOR = "user-creator";
const ASSIGNEE_A = "user-a";
const ASSIGNEE_B = "user-b";
const OUTSIDER = "user-outsider";
const MATCH_ID = "match-1";
const ORG_FINANCE = "org-finance";

function manageCtx(userId = CREATOR) {
  return {
    tenantId: TENANT_A,
    userId,
    permissionKeys: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.TASKS_MANAGE,
    ],
  };
}

function viewOnlyCtx(userId = CREATOR) {
  return {
    tenantId: TENANT_A,
    userId,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    tenantId: TENANT_A,
    title: "Task",
    description: null,
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    reminder1At: null,
    reminder2At: null,
    reminder1PresetKey: null,
    reminder2PresetKey: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: CREATOR,
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
    updatedAt: new Date("2026-09-21T10:00:00.000Z"),
    assignees: [],
    orgUnit: null,
    ...overrides,
  };
}

function setupCreateTransaction(row: ReturnType<typeof taskRow>) {
  mocks.taskCreate.mockResolvedValue(row);
  mocks.taskFindFirst.mockResolvedValue(row);
  mocks.taskAssigneeCreateMany.mockResolvedValue({ count: 0 });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      task: {
        create: mocks.taskCreate,
        findFirstOrThrow: mocks.taskFindFirst,
      },
      taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
    }),
  );
  mocks.writeAuditRecord.mockResolvedValue(undefined);
  mocks.tenantMembershipFindMany.mockResolvedValue([]);
}

describe("AUFGABEN-06F1-A3 creation defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindFirst.mockResolvedValue({ id: MATCH_ID });
    mocks.orgUnitFindFirst.mockResolvedValue({ status: "ACTIVE" });
  });

  it("A3-1 normal root Task with omitted visibility defaults CLUB", async () => {
    setupCreateTransaction(taskRow());
    await createTask(manageCtx(), { title: "Root" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      }),
    );
  });

  it("A3-2 normal root Task default has orgUnitId null", async () => {
    setupCreateTransaction(taskRow());
    await createTask(manageCtx(), { title: "Root" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgUnitId: null }),
      }),
    );
  });

  it("A3-3 contextual root Task defaults CLUB", async () => {
    setupCreateTransaction(
      taskRow({
        contextType: TaskContextType.MATCH,
        contextId: MATCH_ID,
      }),
    );
    const ctx = {
      ...manageCtx(),
      permissionKeys: [...manageCtx().permissionKeys, PERMISSIONS.EVENTS_VIEW],
    };
    await createTaskWithContextDefaults(ctx, {
      trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
      task: { title: "Match task" },
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
          orgUnitId: null,
        }),
      }),
    );
  });

  it("A3-4 06P Quick Task defaults CLUB", async () => {
    setupCreateTransaction(
      taskRow({
        assignees: [
          {
            userId: CREATOR,
            assignedAt: new Date(),
            user: { id: CREATOR, firstName: "C", lastName: "R" },
          },
        ],
      }),
    );
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: CREATOR }]);
    await createQuickTask(viewOnlyCtx(), {
      title: "Quick",
      assigneeUserIds: [CREATOR],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
          orgUnitId: null,
        }),
      }),
    );
  });

  it("A3-5 explicit ORG_UNIT remains ORG_UNIT", async () => {
    setupCreateTransaction(
      taskRow({
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      }),
    );
    await createTask(
      {
        ...manageCtx(),
        auth: {
          ...EMPTY_TASK_AUTH_SCOPE,
          permissionManageOrgUnitIds: [ORG_FINANCE],
          permissionReadOrgUnitIds: [ORG_FINANCE],
          memberOrgUnitIds: [ORG_FINANCE],
        },
      },
      {
        title: "Org unit task",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      },
    );
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
        }),
      }),
    );
  });

  it("A3-6 explicit ASSIGNEES_ONLY remains ASSIGNEES_ONLY", async () => {
    setupCreateTransaction(
      taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
    );
    await createTask(manageCtx(), {
      title: "Private",
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        }),
      }),
    );
  });

  it("A3-7 existing confidential Task read semantics unchanged", () => {
    const confidential: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: CREATOR,
      assigneeUserIds: [ASSIGNEE_A],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    const reader = {
      tenantId: TENANT_A,
      userId: OUTSIDER,
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    expect(canReadTask(reader, confidential)).toBe(false);
  });

  it("A3-8 single assignee does not force ASSIGNEES_ONLY", async () => {
    setupCreateTransaction(taskRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: ASSIGNEE_A }]);
    await createTask(manageCtx(), {
      title: "One assignee",
      assigneeUserIds: [ASSIGNEE_A],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      }),
    );
  });

  it("A3-9 multiple assignees do not change visibility default", async () => {
    setupCreateTransaction(taskRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([
      { userId: ASSIGNEE_A },
      { userId: ASSIGNEE_B },
    ]);
    await createTask(manageCtx(), {
      title: "Many assignees",
      assigneeUserIds: [ASSIGNEE_A, ASSIGNEE_B],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      }),
    );
  });

  it("A3-10 Task context does not change visibility default", async () => {
    setupCreateTransaction(
      taskRow({
        contextType: TaskContextType.MATCH,
        contextId: MATCH_ID,
      }),
    );
    const ctx = {
      ...manageCtx(),
      permissionKeys: [...manageCtx().permissionKeys, PERMISSIONS.EVENTS_VIEW],
    };
    await createTaskWithContextDefaults(ctx, {
      trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
      task: { title: "Ctx" },
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      }),
    );
  });

  it("A3-11 Subtask of CLUB parent remains CLUB", async () => {
    const parent = taskRow({
      id: "parent-1",
      parentTaskId: null,
      visibilityScope: TaskVisibilityScope.CLUB,
    });
    const sub = taskRow({
      id: "sub-1",
      parentTaskId: "parent-1",
      visibilityScope: TaskVisibilityScope.CLUB,
    });
    setupCreateTransaction(sub);
    let parentLoadCount = 0;
    mocks.taskFindFirst.mockImplementation(async () => {
      parentLoadCount += 1;
      return parentLoadCount === 1 ? parent : sub;
    });
    await createSubtask(manageCtx(), "parent-1", { title: "Sub" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.CLUB,
          orgUnitId: null,
        }),
      }),
    );
  });

  it("A3-12 Subtask of ORG_UNIT parent remains ORG_UNIT", async () => {
    const parent = taskRow({
      id: "parent-ou",
      parentTaskId: null,
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
    });
    const sub = taskRow({
      id: "sub-ou",
      parentTaskId: "parent-ou",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
    });
    setupCreateTransaction(sub);
    let parentLoadCount = 0;
    mocks.taskFindFirst.mockImplementation(async () => {
      parentLoadCount += 1;
      return parentLoadCount === 1 ? parent : sub;
    });
    await createSubtask(manageCtx(), "parent-ou", { title: "Sub OU" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
        }),
      }),
    );
  });

  it("A3-13 Subtask of ASSIGNEES_ONLY parent remains ASSIGNEES_ONLY", async () => {
    const parent = taskRow({
      id: "parent-private",
      parentTaskId: null,
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    });
    const sub = taskRow({
      id: "sub-private",
      parentTaskId: "parent-private",
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    });
    setupCreateTransaction(sub);
    let parentLoadCount = 0;
    mocks.taskFindFirst.mockImplementation(async () => {
      parentLoadCount += 1;
      return parentLoadCount === 1 ? parent : sub;
    });
    await createSubtask(manageCtx(), "parent-private", { title: "Sub private" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        }),
      }),
    );
  });

  it("A3-14 CLUB visibility does not put unassigned Task in Meine Aufgaben", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    const mine = await listMyTasks(
      {
        tenantId: TENANT_A,
        userId: OUTSIDER,
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      },
      { openOnly: true },
    );
    expect(mine).toHaveLength(0);
    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignees: { some: { userId: OUTSIDER, tenantId: TENANT_A } },
        }),
      }),
    );
  });

  it("A3-15 CLUB visibility does not put unassigned Task on personal Agenda", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    await loadTaskDeadlineProjections({
      tenantId: TENANT_A,
      userId: OUTSIDER,
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-12-31"),
      tasksViewAuthorized: true,
    });
    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignees: { some: { userId: OUTSIDER, tenantId: TENANT_A } },
        }),
      }),
    );
  });

  it("A3-16 CLUB visibility does not notify all organisation users", async () => {
    setupCreateTransaction(taskRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: ASSIGNEE_A }]);
    await createTask(manageCtx(), {
      title: "Club visible",
      assigneeUserIds: [ASSIGNEE_A],
    });
    expect(emitTaskAssignmentNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assigneeRows: expect.arrayContaining([
          expect.objectContaining({ userId: ASSIGNEE_A }),
        ]),
      }),
    );
    const payload = vi.mocked(emitTaskAssignmentNotifications).mock.calls[0]?.[1];
    expect(payload?.assigneeRows).toHaveLength(1);
  });

  it("A3-17 tasks.view_all still does not bypass explicit ASSIGNEES_ONLY", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: CREATOR,
      assigneeUserIds: [ASSIGNEE_A],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    expect(
      canReadTask(
        {
          tenantId: TENANT_A,
          userId: OUTSIDER,
          permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
          auth: EMPTY_TASK_AUTH_SCOPE,
        },
        record,
      ),
    ).toBe(false);
  });

  it("A3-18 tasks.manage still does not bypass explicit confidential scope", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: CREATOR,
      assigneeUserIds: [ASSIGNEE_A],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    expect(
      canReadTask(
        {
          tenantId: TENANT_A,
          userId: OUTSIDER,
          permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
          auth: EMPTY_TASK_AUTH_SCOPE,
        },
        record,
      ),
    ).toBe(false);
  });

  it("A3-19 Super Admin still does not bypass explicit confidential scope", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: CREATOR,
      assigneeUserIds: [ASSIGNEE_A],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    expect(
      canReadTask(
        {
          tenantId: TENANT_A,
          userId: "super-admin",
          permissionKeys: ["platform.super_admin"],
          auth: EMPTY_TASK_AUTH_SCOPE,
        },
        record,
      ),
    ).toBe(false);
  });

  it("A3-20 foreign tenant isolation unchanged", () => {
    const where = buildTaskVisibilityWhere({
      tenantId: TENANT_A,
      userId: OUTSIDER,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      auth: EMPTY_TASK_AUTH_SCOPE,
    });
    expect(where).toEqual(
      expect.objectContaining({
        tenantId: TENANT_A,
      }),
    );
    expect(where).not.toEqual(expect.objectContaining({ tenantId: TENANT_B }));
  });
});
