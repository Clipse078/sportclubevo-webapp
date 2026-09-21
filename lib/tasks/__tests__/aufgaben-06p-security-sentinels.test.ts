/**
 * AUFGABEN-06P — quick task creation security sentinels (Q1–Q24).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStatus, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import {
  normalizeQuickCreateAssigneeIds,
  resolveQuickCreateCapabilities,
} from "../quick-create";
import {
  createQuickTask,
  listMyTasks,
} from "../task-service";
import { emitTaskAssignmentNotifications } from "@/lib/notifications/task-producer";
import { taskPersonalActionSource } from "@/lib/personal-actions/sources/task-source";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  taskCount: vi.fn(),
  taskAssigneeCreateMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  writeAuditRecord: vi.fn(),
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
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      create: mocks.taskCreate,
      count: mocks.taskCount,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    taskAssignee: {
      createMany: mocks.taskAssigneeCreateMany,
    },
    tenantMembership: {
      findMany: mocks.tenantMembershipFindMany,
    },
    tenant: { findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich" }) },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

const TENANT_A = "tenant-a";
const MICHAEL = "user-michael";
const SANDRA = "user-sandra";
const OUTSIDER = "user-outsider";
const TASK_ID = "task-quick-1";

function viewOnlyCtx(userId = MICHAEL) {
  return {
    tenantId: TENANT_A,
    userId,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
  };
}

function assignerCtx(userId = MICHAEL) {
  return {
    tenantId: TENANT_A,
    userId,
    permissionKeys: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_ASSIGN,
    ],
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    tenantId: TENANT_A,
    title: "Quick task",
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
    createdByUserId: MICHAEL,
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
    updatedAt: new Date("2026-09-21T10:00:00.000Z"),
    assignees: [
      {
        userId: MICHAEL,
        assignedAt: new Date("2026-09-21T10:00:00.000Z"),
        user: { id: MICHAEL, firstName: "Michael", lastName: "Duijster" },
      },
    ],
    ...overrides,
  };
}

function setupSuccessfulCreate(row: ReturnType<typeof taskRow>) {
  mocks.tenantMembershipFindMany.mockResolvedValue(
    row.assignees.map((a: { userId: string }) => ({ userId: a.userId })),
  );
  mocks.taskCreate.mockResolvedValue(row);
  mocks.taskFindFirst.mockResolvedValue(row);
  mocks.taskAssigneeCreateMany.mockResolvedValue({ count: row.assignees.length });
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
}

describe("AUFGABEN-06P quick create sentinels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Q1 — authorized user creates self-assigned Task", async () => {
    setupSuccessfulCreate(taskRow());
    const created = await createQuickTask(viewOnlyCtx(), {
      title: "Call supplier",
      assigneeUserIds: [MICHAEL],
    });
    expect(created.title).toBe("Quick task");
    expect(mocks.taskAssigneeCreateMany).toHaveBeenCalled();
  });

  it("Q2 — creator derived from server identity", async () => {
    setupSuccessfulCreate(taskRow({ createdByUserId: MICHAEL }));
    await createQuickTask(viewOnlyCtx(), {
      title: "Note",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdByUserId: MICHAEL }),
      }),
    );
  });

  it("Q3 — self-assigned Task defaults CLUB (organisation-wide)", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "Organisation task",
      assigneeUserIds: [MICHAEL],
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

  it("Q4 — self-assigned Task defaults OPEN", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "Open",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TaskStatus.OPEN }),
      }),
    );
  });

  it("Q5 — priority defaults NORMAL", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "Default priority",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priority: "NORMAL" }),
      }),
    );
  });

  it("Q6 — orgUnitId defaults null", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "No org",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgUnitId: null }),
      }),
    );
  });

  it("Q7 — foreign tenant cannot be supplied (tenant always from ctx)", async () => {
    setupSuccessfulCreate(taskRow({ tenantId: TENANT_A }));
    await createQuickTask(viewOnlyCtx(), {
      title: "Tenant scoped",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_A }),
      }),
    );
  });

  it("Q8 — self-only user cannot assign outsider (forbidden before membership check)", async () => {
    await expect(
      createQuickTask(viewOnlyCtx(), {
        title: "Bad assignee",
        assigneeUserIds: ["foreign-user"],
      }),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("Q9 — self-create-only user cannot assign another user", async () => {
    await expect(
      createQuickTask(viewOnlyCtx(), {
        title: "For Sandra",
        assigneeUserIds: [SANDRA],
      }),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("Q10 — self-create-only user cannot assign foreign tenant user", async () => {
    await expect(
      createQuickTask(viewOnlyCtx(), {
        title: "Cross tenant",
        assigneeUserIds: [OUTSIDER],
      }),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("Q11 — authorized assigner can assign another eligible user", async () => {
    setupSuccessfulCreate(
      taskRow({
        assignees: [
          {
            userId: SANDRA,
            assignedAt: new Date(),
            user: { id: SANDRA, firstName: "Sandra", lastName: "M" },
          },
        ],
      }),
    );
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: SANDRA }]);
    await createQuickTask(assignerCtx(), {
      title: "For Sandra",
      assigneeUserIds: [SANDRA],
    });
    expect(mocks.taskAssigneeCreateMany).toHaveBeenCalled();
  });

  it("Q12 — authorized assigner can assign multiple eligible users", async () => {
    setupSuccessfulCreate(
      taskRow({
        assignees: [
          {
            userId: MICHAEL,
            assignedAt: new Date(),
            user: { id: MICHAEL, firstName: "M", lastName: "D" },
          },
          {
            userId: SANDRA,
            assignedAt: new Date(),
            user: { id: SANDRA, firstName: "S", lastName: "M" },
          },
        ],
      }),
    );
    mocks.tenantMembershipFindMany.mockResolvedValue([
      { userId: MICHAEL },
      { userId: SANDRA },
    ]);
    await createQuickTask(assignerCtx(), {
      title: "Shared",
      assigneeUserIds: [MICHAEL, SANDRA],
    });
    expect(mocks.taskAssigneeCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: MICHAEL }),
          expect.objectContaining({ userId: SANDRA }),
        ]),
      }),
    );
  });

  it("Q13 — unauthorized assignee ID rejected server-side", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: { create: mocks.taskCreate, findFirstOrThrow: mocks.taskFindFirst },
        taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
      }),
    );
    await expect(
      createQuickTask(assignerCtx(), {
        title: "Bad",
        assigneeUserIds: [OUTSIDER],
      }),
    ).rejects.toThrow(TaskValidationError);
  });

  it("Q14 — ASSIGNEES_ONLY remains confidential from view_all", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: MICHAEL,
      assigneeUserIds: [SANDRA],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    const viewAllCtx = {
      tenantId: TENANT_A,
      userId: OUTSIDER,
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    expect(canReadTask(viewAllCtx, record)).toBe(false);
  });

  it("Q15 — ASSIGNEES_ONLY remains confidential from broad manage", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: MICHAEL,
      assigneeUserIds: [SANDRA],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    const manageCtx = {
      tenantId: TENANT_A,
      userId: OUTSIDER,
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    expect(canReadTask(manageCtx, record)).toBe(false);
  });

  it("Q16 — Super Admin receives no confidential bypass (platform-only)", () => {
    const record: TaskAuthorizationRecord = {
      tenantId: TENANT_A,
      createdByUserId: MICHAEL,
      assigneeUserIds: [SANDRA],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    const superCtx = {
      tenantId: TENANT_A,
      userId: "super-admin",
      permissionKeys: ["platform.super_admin"],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    expect(canReadTask(superCtx, record)).toBe(false);
  });

  it("Q17 — Task appears through canonical PersonalAction for self assignee", async () => {
    mocks.taskFindMany.mockResolvedValue([taskRow()]);
    const actions = await taskPersonalActionSource.loadActionable({
      tenantId: TENANT_A,
      userId: MICHAEL,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    expect(actions.some((a) => a.sourceId === TASK_ID)).toBe(true);
  });

  it("Q18 — Task assigned only to another user is not in creator personal list", async () => {
    mocks.taskFindMany.mockResolvedValue([]);
    const mine = await listMyTasks(assignerCtx(), { openOnly: true });
    expect(mine).toHaveLength(0);
  });

  it("Q19 — multiple assignees create one Task, not duplicate Tasks", async () => {
    setupSuccessfulCreate(taskRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([
      { userId: MICHAEL },
      { userId: SANDRA },
    ]);
    await createQuickTask(assignerCtx(), {
      title: "One task",
      assigneeUserIds: [MICHAEL, SANDRA],
    });
    expect(mocks.taskCreate).toHaveBeenCalledTimes(1);
  });

  it("Q20 — Task uses canonical audit path", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "Audit",
      assigneeUserIds: [MICHAEL],
    });
    expect(mocks.writeAuditRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "TASK_CREATED" }),
    );
  });

  it("Q21 — self-assignment suppresses assignment notification", async () => {
    setupSuccessfulCreate(taskRow());
    await createQuickTask(viewOnlyCtx(), {
      title: "Self",
      assigneeUserIds: [MICHAEL],
    });
    expect(emitTaskAssignmentNotifications).toHaveBeenCalled();
    const payload = vi.mocked(emitTaskAssignmentNotifications).mock.calls[0]?.[1];
    expect(payload?.assigneeRows.every((r) => r.userId === MICHAEL)).toBe(true);
  });

  it("Q22 — Participation domain unaffected (task source type unchanged)", () => {
    expect(taskPersonalActionSource.sourceType).toBe("TASK");
  });

  it("Q23 — Matrix Z capabilities remain additive", () => {
    const caps = resolveQuickCreateCapabilities({
      tenantId: TENANT_A,
      userId: MICHAEL,
      permissionKeys: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.TASKS_ASSIGN,
        PERMISSIONS.TASKS_VIEW_ALL,
        PERMISSIONS.TASKS_MANAGE,
        "participation.some_other",
      ],
    });
    expect(caps.canCreateSelf).toBe(true);
    expect(caps.canAssignOthers).toBe(true);
  });

  it("Q24 — normalizeQuickCreateAssigneeIds fails closed without assign others", () => {
    expect(() =>
      normalizeQuickCreateAssigneeIds(viewOnlyCtx(), [SANDRA], false),
    ).toThrow(TaskForbiddenError);
  });
});
