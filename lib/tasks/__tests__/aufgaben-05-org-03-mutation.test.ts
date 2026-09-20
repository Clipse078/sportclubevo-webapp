/**
 * AUFGABEN-05-ORG-03 — org/visibility mutation authorization matrix.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canAssignTaskOrgUnit,
  canMutateTaskOrgVisibility,
  canSetTaskVisibilityScope,
  validateTaskOrgVisibilityMutation,
} from "../task-org-mutation-policy";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { createTask, updateTask } from "../task-service";
import { getTaskManagementSummary, listTaskManagementItems } from "../management-service";
import { buildTaskReadWhere } from "../task-authorization";

const mocks = vi.hoisted(() => ({
  taskCreate: vi.fn(),
  taskUpdate: vi.fn(),
  taskFindFirst: vi.fn(),
  transaction: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    task: {
      create: mocks.taskCreate,
      update: mocks.taskUpdate,
      findFirst: mocks.taskFindFirst,
      findFirstOrThrow: mocks.taskFindFirst,
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
    },
    orgUnit: { findFirst: mocks.orgUnitFindFirst },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    tenant: { findUnique: vi.fn().mockResolvedValue({ locale: "de-CH", timezone: "Europe/Zurich" }) },
    auditLog: { create: mocks.auditCreate },
    taskAssignee: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/notifications/task-producer", () => ({
  computeNewAssigneeRows: vi.fn(() => []),
  emitTaskAssignmentNotifications: vi.fn(),
  emitTaskDeadlineChangedNotifications: vi.fn(),
}));

vi.mock("../context-validation", () => ({
  validateTaskContext: vi.fn(),
}));

const TENANT = "tenant-a";
const USER = "user-actor";
const OTHER = "user-other";
const ORG_A = "org-a";
const ORG_B = "org-b";
const ORG_FOREIGN = "org-foreign";

function ctx(
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
) {
  return {
    tenantId: TENANT,
    userId: USER,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function existing(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT,
    createdByUserId: OTHER,
    assigneeUserIds: [] as string[],
    visibilityScope: TaskVisibilityScope.CLUB,
    orgUnitId: null,
    ...overrides,
  };
}

describe("AUFGABEN-05-ORG-03 destination visibility policy", () => {
  it("A — club admin creates CLUB task", () => {
    const admin = ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]);
    expect(
      canSetTaskVisibilityScope(
        admin,
        { visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null },
        "create",
      ),
    ).toBe(true);
  });

  it("B — scoped manager creates ORG_UNIT task in own unit", () => {
    const scoped = ctx([PERMISSIONS.TASKS_CREATE], {
      permissionManageOrgUnitIds: [ORG_A],
    });
    expect(
      canSetTaskVisibilityScope(
        scoped,
        { visibilityScope: TaskVisibilityScope.ORG_UNIT, orgUnitId: ORG_A },
        "create",
      ),
    ).toBe(true);
  });

  it("D — scoped manager cannot select unrelated org unit", () => {
    const scoped = ctx([PERMISSIONS.TASKS_CREATE], {
      permissionManageOrgUnitIds: [ORG_A],
    });
    expect(canAssignTaskOrgUnit(scoped, ORG_B)).toBe(false);
  });

  it("K — ORG_UNIT to CLUB requires tenant-wide manage on edit", () => {
    const scoped = ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_VIEW], {
      permissionManageOrgUnitIds: [ORG_A],
    });
    expect(
      canSetTaskVisibilityScope(
        scoped,
        { visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: ORG_A },
        "edit",
      ),
    ).toBe(false);
  });

  it("L — club admin may publish ORG_UNIT to CLUB when authorized", () => {
    const admin = ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]);
    expect(
      canMutateTaskOrgVisibility(
        admin,
        existing({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_A,
        }),
        { visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: ORG_A },
        "edit",
      ),
    ).toBe(true);
  });

  it("I — assignee cannot escalate ASSIGNEES_ONLY to CLUB", () => {
    const assignee = ctx([PERMISSIONS.TASKS_VIEW], {});
    expect(
      canMutateTaskOrgVisibility(
        assignee,
        existing({
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          assigneeUserIds: [USER],
        }),
        { visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null },
        "edit",
      ),
    ).toBe(false);
  });

  it("M — multi-role union includes both scoped org units", () => {
    const multi = ctx([PERMISSIONS.TASKS_CREATE], {
      permissionManageOrgUnitIds: [ORG_A, ORG_B],
    });
    expect(canAssignTaskOrgUnit(multi, ORG_A)).toBe(true);
    expect(canAssignTaskOrgUnit(multi, ORG_B)).toBe(true);
  });
});

describe("AUFGABEN-05-ORG-03 validateTaskOrgVisibilityMutation fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgUnitFindFirst.mockImplementation(({ where }: { where: { id: string; tenantId: string } }) => {
      if (where.id === ORG_FOREIGN || where.tenantId !== TENANT) return Promise.resolve(null);
      if (where.id === "org-archived") {
        return Promise.resolve({ id: "org-archived", status: "ARCHIVED" });
      }
      return Promise.resolve({ id: where.id, status: "ACTIVE" });
    });
  });

  it("G — ORG_UNIT without orgUnitId is rejected", async () => {
    await expect(
      validateTaskOrgVisibilityMutation(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]),
        { visibilityScope: TaskVisibilityScope.ORG_UNIT, orgUnitId: null },
        { mode: "create" },
      ),
    ).rejects.toMatchObject({ name: "TaskValidationError" });
  });

  it("E — foreign tenant org unit is rejected", async () => {
    await expect(
      validateTaskOrgVisibilityMutation(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]),
        { visibilityScope: TaskVisibilityScope.ORG_UNIT, orgUnitId: ORG_FOREIGN },
        { mode: "create" },
      ),
    ).rejects.toMatchObject({ name: "TaskValidationError" });
  });

  it("F — archived org unit for new ownership is rejected", async () => {
    await expect(
      validateTaskOrgVisibilityMutation(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]),
        { visibilityScope: TaskVisibilityScope.ORG_UNIT, orgUnitId: "org-archived" },
        { mode: "create" },
      ),
    ).rejects.toMatchObject({ name: "TaskValidationError" });
  });
});

describe("AUFGABEN-05-ORG-03 service persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          create: mocks.taskCreate,
          update: mocks.taskUpdate,
          findFirstOrThrow: mocks.taskFindFirst,
        },
        taskAssignee: { createMany: vi.fn() },
        auditLog: { create: mocks.auditCreate },
        tenant: { findUnique: vi.fn() },
      }),
    );
    mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_A, status: "ACTIVE" });
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    mocks.taskCreate.mockResolvedValue({ id: "task-1" });
    mocks.taskFindFirst.mockResolvedValue({
      id: "task-1",
      tenantId: TENANT,
      title: "T",
      description: null,
      status: "OPEN",
      priority: "NORMAL",
      dueAt: null,
      completedAt: null,
      contextType: null,
      contextId: null,
      parentTaskId: null,
      taskSeriesId: null,
      orgUnitId: ORG_A,
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      createdByUserId: USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignees: [],
      orgUnit: { tenantId: TENANT },
    });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("createTask persists validated org metadata", async () => {
    await createTask(ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]), {
      title: "Finance task",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_A,
    });

    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: ORG_A,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      }),
    );
  });
});

describe("AUFGABEN-05-ORG-03 filter security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskCount.mockResolvedValue(0);
    mocks.taskFindMany.mockResolvedValue([]);
  });

  it("management queries keep authorized universe as AND root", async () => {
    const serviceCtx = ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    await listTaskManagementItems(
      serviceCtx,
      {
        view: "ALLE",
        search: "",
        sort: "DEADLINE_ASC",
        status: "ACTIVE",
        assigneeUserId: null,
        priority: null,
        deadline: "ALL",
        recurring: "ALL",
        contextType: null,
        orgUnitId: ORG_A,
        visibilityScope: "ASSIGNEES_ONLY",
        page: 1,
      },
      "Europe/Zurich",
      "de-CH",
    );

    const where = mocks.taskCount.mock.calls[0]![0].where;
    expect(where.AND[0]).toEqual(buildTaskReadWhere(serviceCtx));
    expect(where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orgUnitId: ORG_A }),
        expect.objectContaining({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
      ]),
    );
  });

  it("KPI counts cannot drop authorization predicate", async () => {
    await getTaskManagementSummary(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
      "Europe/Zurich",
    );
    const where = mocks.taskCount.mock.calls[0]![0].where;
    expect(where.AND[0].OR).toBeDefined();
    expect(where.AND[0].tenantId).toBe(TENANT);
  });
});
