/**
 * AUFGABEN-05-ORG-04 — propagation-bound org/visibility security.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertTaskOrgVisibilityPropagationEditable,
  isTaskOrgVisibilityPropagationLocked,
  requestsTaskOrgVisibilityChange,
  resolvePropagatedTaskOrgVisibility,
} from "../task-org-propagation";
import { createSubtask, updateTask } from "../task-service";
import { resolveTaskWorkspaceCapabilities } from "../workspace-permissions";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import type { TaskDto, TaskServiceContext } from "../types";

const mocks = vi.hoisted(() => ({
  taskCreate: vi.fn(),
  taskUpdate: vi.fn(),
  taskFindFirst: vi.fn(),
  transaction: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
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
const PARENT = "parent-1";
const ORG_A = "org-a";

function ctx(permissionKeys: string[]): TaskServiceContext {
  return {
    tenantId: TENANT,
    userId: USER,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, permissionManageOrgUnitIds: [ORG_A] },
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PARENT,
    tenantId: TENANT,
    title: "Parent",
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
    ...overrides,
  };
}

function taskDto(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: PARENT,
    tenantId: TENANT,
    title: "Parent",
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignees: [],
    ...overrides,
  };
}

describe("AUFGABEN-05-ORG-04 propagation helpers", () => {
  it("copies source org metadata verbatim", () => {
    expect(
      resolvePropagatedTaskOrgVisibility({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    ).toEqual({
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    });
  });

  it("locks subtasks and series occurrences", () => {
    expect(
      isTaskOrgVisibilityPropagationLocked({ parentTaskId: "p", taskSeriesId: null }),
    ).toBe(true);
    expect(
      isTaskOrgVisibilityPropagationLocked({ parentTaskId: null, taskSeriesId: "s" }),
    ).toBe(true);
    expect(
      isTaskOrgVisibilityPropagationLocked({ parentTaskId: null, taskSeriesId: null }),
    ).toBe(false);
  });

  it("detects actual org/visibility transitions only", () => {
    const existing = {
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_A,
    };
    expect(
      requestsTaskOrgVisibilityChange(existing, {
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
      }),
    ).toBe(false);
    expect(
      requestsTaskOrgVisibilityChange(existing, { visibilityScope: TaskVisibilityScope.CLUB }),
    ).toBe(true);
    expect(requestsTaskOrgVisibilityChange(existing, { orgUnitId: "org-b" })).toBe(true);
  });

  it("rejects org edits on propagation-locked tasks", () => {
    expect(() =>
      assertTaskOrgVisibilityPropagationEditable({
        parentTaskId: "child",
        taskSeriesId: null,
      }),
    ).toThrow(/Teilaufgaben/);

    expect(() =>
      assertTaskOrgVisibilityPropagationEditable({
        parentTaskId: null,
        taskSeriesId: "series-1",
      }),
    ).toThrow(/Serie/);
  });
});

describe("AUFGABEN-05-ORG-04 subtask inheritance (service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          create: mocks.taskCreate,
          findFirstOrThrow: mocks.taskFindFirst,
        },
        taskAssignee: { createMany: vi.fn() },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
  });

  it("createSubtask persists parent org snapshot only", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(
        taskRow({
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          orgUnitId: null,
        }),
      )
      .mockResolvedValueOnce(
        taskRow({
          id: "sub-1",
          parentTaskId: PARENT,
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          orgUnitId: null,
        }),
      );
    mocks.taskCreate.mockResolvedValue({ id: "sub-1" });

    await createSubtask(ctx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_VIEW]), PARENT, {
      title: "Child",
    });

    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: null,
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        }),
      }),
    );
  });
});

describe("AUFGABEN-05-ORG-04 mutation hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_A, status: "ACTIVE" });
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
  });

  it("denies org-only mutation on propagation-locked subtask", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "sub-1",
        parentTaskId: PARENT,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
      }),
    );

    await expect(
      updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "sub-1", {
        orgUnitId: "org-b",
      }),
    ).rejects.toMatchObject({ name: "TaskForbiddenError" });
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("denies visibility-only mutation on propagation-locked subtask", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "sub-1",
        parentTaskId: PARENT,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    );

    await expect(
      updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "sub-1", {
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
      }),
    ).rejects.toMatchObject({ name: "TaskForbiddenError" });
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("allows legitimate field updates when serialized org values are unchanged", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "sub-1",
        parentTaskId: PARENT,
        title: "After",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
      }),
    );
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: { update: mocks.taskUpdate },
        auditLog: { create: mocks.auditCreate },
        tenant: { findUnique: vi.fn() },
      }),
    );
    mocks.taskUpdate.mockResolvedValue(
      taskRow({
        id: "sub-1",
        parentTaskId: PARENT,
        title: "After",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
      }),
    );
    mocks.auditCreate.mockResolvedValue({});

    await updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "sub-1", {
      title: "After",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_A,
    });

    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "After" }),
      }),
    );
    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ visibilityScope: expect.anything() }),
      }),
    );
  });

  it("blocks club admin from widening subtask visibility via updateTask", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "sub-1",
        parentTaskId: PARENT,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    );

    await expect(
      updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "sub-1", {
        visibilityScope: TaskVisibilityScope.CLUB,
        orgUnitId: null,
      }),
    ).rejects.toMatchObject({ name: "TaskForbiddenError" });

    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("blocks org mutation on series-generated root occurrence", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "occ-1",
        taskSeriesId: "series-1",
        seriesOccurrenceKey: "series-1:2026-01-01",
      }),
    );

    await expect(
      updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "occ-1", {
        visibilityScope: TaskVisibilityScope.CLUB,
      }),
    ).rejects.toMatchObject({ name: "TaskForbiddenError" });

    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("still allows org mutation on standalone root tasks", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(taskRow())
      .mockResolvedValueOnce(taskRow({ visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null }));
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: { update: mocks.taskUpdate },
        auditLog: { create: mocks.auditCreate },
        tenant: { findUnique: vi.fn() },
      }),
    );
    mocks.taskUpdate.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null }),
    );
    mocks.auditCreate.mockResolvedValue({});

    await updateTask(ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), PARENT, {
      visibilityScope: TaskVisibilityScope.CLUB,
      orgUnitId: null,
    });

    expect(mocks.taskUpdate).toHaveBeenCalled();
  });
});

describe("AUFGABEN-05-ORG-04 workspace capabilities", () => {
  const manageCtx = ctx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE]);

  it("hides org editor for subtasks even when manager could edit standalone tasks", () => {
    const caps = resolveTaskWorkspaceCapabilities(
      manageCtx,
      taskDto({ id: "sub-1", parentTaskId: PARENT }),
    );
    expect(caps.canEditOrgVisibility).toBe(false);
  });

  it("hides org editor for series occurrences", () => {
    const caps = resolveTaskWorkspaceCapabilities(
      manageCtx,
      taskDto({ id: "occ-1", taskSeriesId: "series-1" }),
    );
    expect(caps.canEditOrgVisibility).toBe(false);
  });

  it("keeps org editor for standalone root tasks", () => {
    const caps = resolveTaskWorkspaceCapabilities(manageCtx, taskDto());
    expect(caps.canEditOrgVisibility).toBe(true);
  });
});
