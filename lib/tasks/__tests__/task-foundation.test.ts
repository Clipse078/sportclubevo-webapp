/**
 * AUFGABEN-01 — task domain, tenancy, authorization, and query tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  taskUpdate: vi.fn(),
  taskCount: vi.fn(),
  taskAssigneeCreateMany: vi.fn(),
  taskAssigneeDeleteMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      create: mocks.taskCreate,
      update: mocks.taskUpdate,
      count: mocks.taskCount,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    taskAssignee: {
      createMany: mocks.taskAssigneeCreateMany,
      deleteMany: mocks.taskAssigneeDeleteMany,
    },
    tenantMembership: {
      findMany: mocks.tenantMembershipFindMany,
    },
    event: { findFirst: vi.fn() },
    trainingSeries: { findFirst: vi.fn() },
    meeting: { findFirst: vi.fn() },
    registration: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    person: { findFirst: vi.fn() },
    workspaceDocument: { findFirst: vi.fn() },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assignTask,
  cancelTask,
  completeTask,
  createTask,
  getTask,
  listMyTasks,
  listTasks,
  updateTask,
} from "../task-service";
import { buildTaskVisibilityWhere, canViewTaskRecord } from "../visibility";
import { ParentHasOpenSubtasksError, TaskForbiddenError, TaskNotFoundError } from "../errors";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const USER_MANAGER = "user-manager";
const USER_ASSIGNEE = "user-assignee";
const USER_OTHER = "user-other";
const TASK_ID = "task-1";

function managerCtx(userId = USER_MANAGER) {
  return {
    tenantId: TENANT_A,
    userId,
    permissionKeys: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TASKS_ASSIGN,
    ],
  };
}

function assigneeCtx() {
  return {
    tenantId: TENANT_A,
    userId: USER_ASSIGNEE,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    tenantId: TENANT_A,
    title: "Test task",
    description: null,
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    createdByUserId: USER_MANAGER,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    assignees: [
      {
        userId: USER_ASSIGNEE,
        assignedAt: new Date("2026-09-01T10:00:00.000Z"),
        user: { id: USER_ASSIGNEE, firstName: "Alex", lastName: "Assignee" },
      },
    ],
    ...overrides,
  };
}

describe("AUFGABEN-01 visibility", () => {
  it("documents MVP visibility for assignee, creator, and managers", () => {
    const assigneeVisible = canViewTaskRecord(assigneeCtx(), {
      tenantId: TENANT_A,
      createdByUserId: USER_MANAGER,
      assigneeUserIds: [USER_ASSIGNEE],
    });
    expect(assigneeVisible).toBe(true);

    const outsiderVisible = canViewTaskRecord(
      { ...assigneeCtx(), userId: USER_OTHER },
      {
        tenantId: TENANT_A,
        createdByUserId: USER_MANAGER,
        assigneeUserIds: [USER_ASSIGNEE],
      },
    );
    expect(outsiderVisible).toBe(false);

    const managerVisible = canViewTaskRecord(managerCtx(), {
      tenantId: TENANT_A,
      createdByUserId: USER_MANAGER,
      assigneeUserIds: [],
    });
    expect(managerVisible).toBe(true);
  });

  it("builds tenant-scoped visibility filters for non-managers", () => {
    const where = buildTaskVisibilityWhere(assigneeCtx());
    expect(where).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER_ASSIGNEE },
        { assignees: { some: { userId: USER_ASSIGNEE, tenantId: TENANT_A } } },
      ],
    });
  });
});

describe("AUFGABEN-01 tenancy isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies cross-tenant read via not found", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(getTask(managerCtx(), TASK_ID)).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect(mocks.taskFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TASK_ID, tenantId: TENANT_A } }),
    );
  });

  it("denies direct ID access when the task is not visible to the actor", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ createdByUserId: USER_OTHER, assignees: [] }),
    );
    await expect(getTask(assigneeCtx(), TASK_ID)).rejects.toBeInstanceOf(
      TaskForbiddenError,
    );
  });

  it("denies direct ID guessing when the task is outside the tenant scope", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(getTask(managerCtx(), "foreign-task-id")).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("rejects cross-tenant assignee membership during assignment", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    await expect(
      assignTask(managerCtx(), TASK_ID, [USER_OTHER]),
    ).rejects.toThrow(/not active members/i);
  });
});

describe("AUFGABEN-01 domain operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          create: mocks.taskCreate,
          update: mocks.taskUpdate,
          findFirstOrThrow: mocks.taskFindFirst,
        },
        taskAssignee: {
          createMany: mocks.taskAssigneeCreateMany,
          deleteMany: mocks.taskAssigneeDeleteMany,
        },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("creates tasks with OPEN status and optional assignees", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: USER_ASSIGNEE }]);
    mocks.taskCreate.mockResolvedValue(taskRow({ assignees: [] }));
    mocks.taskFindFirst.mockResolvedValue(taskRow());

    const dto = await createTask(managerCtx(), {
      title: "Neue Aufgabe",
      assigneeUserIds: [USER_ASSIGNEE],
    });

    expect(dto.title).toBe("Test task");
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          status: TaskStatus.OPEN,
          createdByUserId: USER_MANAGER,
        }),
      }),
    );
    expect(mocks.taskAssigneeCreateMany).toHaveBeenCalled();
  });

  it("sets completedAt when completing a task", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([]);
    mocks.taskUpdate.mockResolvedValue(
      taskRow({
        status: TaskStatus.DONE,
        completedAt: new Date("2026-09-02T12:00:00.000Z"),
      }),
    );

    const dto = await completeTask(assigneeCtx(), TASK_ID);
    expect(dto.status).toBe(TaskStatus.DONE);
    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TaskStatus.DONE,
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("allows assignees to complete without manage permission", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([]);
    mocks.taskUpdate.mockResolvedValue(taskRow({ status: TaskStatus.DONE }));
    await expect(completeTask(assigneeCtx(), TASK_ID)).resolves.toBeDefined();
  });

  it("blocks parent completion while actionable subtasks remain", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([{ status: TaskStatus.OPEN }]);
    await expect(completeTask(managerCtx(), TASK_ID)).rejects.toBeInstanceOf(
      ParentHasOpenSubtasksError,
    );
  });

  it("blocks unauthorized users from managing task content", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ assignees: [] }));
    await expect(
      updateTask(assigneeCtx(), TASK_ID, { title: "Nope" }),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });

  it("allows managers to cancel tasks", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskUpdate.mockResolvedValue(
      taskRow({ status: TaskStatus.CANCELLED }),
    );
    const dto = await cancelTask(managerCtx(), TASK_ID);
    expect(dto.status).toBe(TaskStatus.CANCELLED);
  });
});

describe("AUFGABEN-01 queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listMyTasks scopes to assignee and tenant", async () => {
    mocks.taskFindMany.mockResolvedValue([taskRow()]);
    await listMyTasks(assigneeCtx(), { openOnly: true });
    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_A,
          assignees: { some: { userId: USER_ASSIGNEE, tenantId: TENANT_A } },
          status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        }),
      }),
    );
  });

  it("listTasks applies visibility filter for non-managers", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    await listTasks(assigneeCtx(), { status: TaskStatus.DONE });
    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      }),
    );
  });
});

describe("AUFGABEN-01 navigation permissions", () => {
  it("uses dedicated task permissions rather than membership admin keys", () => {
    expect(PERMISSIONS.TASKS_VIEW).toBe("tasks.view");
    expect(PERMISSIONS.TASKS_VIEW).not.toBe(PERMISSIONS.USERS_MANAGE_MEMBERSHIPS);
  });
});
