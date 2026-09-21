/**
 * AUFGABEN-06F1-A2 — contextual create canonical semantics (F27–F31).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType, TaskStatus, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError } from "../errors";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { createTaskWithContextDefaults } from "../contextual-task-create";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  taskCreate: vi.fn(),
  assigneeCreateMany: vi.fn(),
  auditCreate: vi.fn(),
  emitAssignment: vi.fn(),
  transaction: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: mocks.eventFindFirst },
    orgUnit: { findFirst: mocks.orgUnitFindFirst },
    task: {
      create: mocks.taskCreate,
      findFirstOrThrow: vi.fn(),
    },
    taskAssignee: { createMany: mocks.assigneeCreateMany },
    auditLog: { create: mocks.auditCreate },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/notifications/task-producer", () => ({
  emitTaskAssignmentNotifications: mocks.emitAssignment,
  computeNewAssigneeRows: (
    previousUserIds: string[],
    nextUserIds: string[],
    assignedAt: Date,
  ) =>
    nextUserIds
      .filter((userId) => !previousUserIds.includes(userId))
      .map((userId) => ({ userId, assignedAt })),
}));

import { createTask } from "../task-service";

const TENANT = "tenant-a";
const ACTOR = "user-actor";
const OTHER = "user-other";
const MATCH_ID = "match-1";

function ctx(permissionKeys: string[], auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {}) {
  return {
    tenantId: TENANT,
    userId: ACTOR,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function taskRow() {
  return {
    id: "task-new",
    tenantId: TENANT,
    title: "Ctx task",
    description: null,
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    reminder1At: null,
    reminder2At: null,
    reminder1PresetKey: null,
    reminder2PresetKey: null,
    completedAt: null,
    contextType: TaskContextType.MATCH,
    contextId: MATCH_ID,
    parentTaskId: null,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: ACTOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [],
    orgUnit: null,
  };
}

describe("AUFGABEN-06F1-A2 F27–F31 contextual create delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindFirst.mockResolvedValue({ id: MATCH_ID });
    mocks.orgUnitFindFirst.mockResolvedValue({ status: "ACTIVE" });
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: OTHER }]);
    mocks.taskCreate.mockImplementation(async (data: { data: { title: string } }) => ({
      ...taskRow(),
      title: data.data.title,
    }));
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        task: {
          create: mocks.taskCreate,
          findFirstOrThrow: vi.fn().mockResolvedValue(taskRow()),
        },
        taskAssignee: { createMany: mocks.assigneeCreateMany },
        auditLog: { create: mocks.auditCreate },
      };
      return fn(tx);
    });
  });

  it("F27 assignment without tasks.assign fails closed", async () => {
    await expect(
      createTaskWithContextDefaults(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        {
          trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
          task: { title: "Assign other", assigneeUserIds: [OTHER] },
        },
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(mocks.assigneeCreateMany).not.toHaveBeenCalled();
    expect(mocks.emitAssignment).not.toHaveBeenCalled();
  });

  it("F27 authorized assignment passes through createTask", async () => {
    await createTaskWithContextDefaults(
      ctx([
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.TASKS_ASSIGN,
        PERMISSIONS.EVENTS_VIEW,
      ]),
      {
        trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
        task: { title: "Assign other", assigneeUserIds: [OTHER] },
      },
    );
    expect(mocks.taskCreate).toHaveBeenCalled();
    expect(mocks.assigneeCreateMany).toHaveBeenCalled();
  });

  it("F28 visibility authorization preserved on contextual create", async () => {
    await expect(
      createTaskWithContextDefaults(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        {
          trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
          task: {
            title: "Org visibility without org rights",
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: "org-1",
          },
        },
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });

  it("F29 orgUnit ownership fails closed without scoped manage", async () => {
    await expect(
      createTaskWithContextDefaults(
        ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        {
          trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
          task: {
            title: "Org task",
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: "org-finance",
          },
        },
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });

  it("F29 authorized orgUnit ownership passes through createTask", async () => {
    await createTaskWithContextDefaults(
      ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW], {
        permissionManageOrgUnitIds: ["org-finance"],
        permissionReadOrgUnitIds: ["org-finance"],
        memberOrgUnitIds: ["org-finance"],
      }),
      {
        trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
        task: {
          title: "Org task ok",
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: "org-finance",
        },
      },
    );
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: "org-finance",
        }),
      }),
    );
  });

  it("F30 audit behavior preserved via canonical createTask", async () => {
    await createTaskWithContextDefaults(
      ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
      {
        trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
        task: { title: "Audit me" },
      },
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "TASK_CREATED" }),
      }),
    );
  });

  it("F31 assignment notifications preserved via canonical createTask", async () => {
    await createTaskWithContextDefaults(
      ctx([
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.TASKS_ASSIGN,
        PERMISSIONS.EVENTS_VIEW,
      ]),
      {
        trustedContext: { contextType: TaskContextType.MATCH, contextId: MATCH_ID },
        task: { title: "Notify", assigneeUserIds: [OTHER] },
      },
    );
    expect(mocks.emitAssignment).toHaveBeenCalled();
  });

});
