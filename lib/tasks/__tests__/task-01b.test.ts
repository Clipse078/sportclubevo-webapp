/**
 * AUFGABEN-01B — subtasks, personal list, recurrence (focused unit tests).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  taskUpdate: vi.fn(),
  taskAssigneeCreateMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  taskSeriesFindMany: vi.fn(),
  taskSeriesCreate: vi.fn(),
  taskSeriesUpdate: vi.fn(),
  taskSeriesAssigneeCreateMany: vi.fn(),
  taskSeriesSubtaskTemplateCreate: vi.fn(),
  taskSeriesSubtaskAssigneeCreateMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      create: mocks.taskCreate,
      update: mocks.taskUpdate,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    taskAssignee: { createMany: mocks.taskAssigneeCreateMany, deleteMany: vi.fn() },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    taskSeries: {
      findFirst: mocks.taskSeriesFindFirst,
      findMany: mocks.taskSeriesFindMany,
      create: mocks.taskSeriesCreate,
      update: mocks.taskSeriesUpdate,
      findFirstOrThrow: mocks.taskSeriesFindFirst,
    },
    taskSeriesAssigneeTemplate: { createMany: mocks.taskSeriesAssigneeCreateMany, deleteMany: vi.fn() },
    taskSeriesSubtaskTemplate: { create: mocks.taskSeriesSubtaskTemplateCreate },
    taskSeriesSubtaskAssigneeTemplate: { createMany: mocks.taskSeriesSubtaskAssigneeCreateMany },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  createSubtask,
  getTaskProgress,
  listMyTasks,
} from "../task-service";
import { generateTaskOccurrences } from "../task-series-service";
import { buildSeriesOccurrenceKey } from "../recurrence-dates";
import { TaskValidationError } from "../errors";

const TENANT = "tenant-a";
const USER = "user-1";
const PARENT = "parent-1";
const CHILD = "child-1";

const ctx = {
  tenantId: TENANT,
  userId: USER,
  permissionKeys: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TASKS_ASSIGN,
  ],
};

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PARENT,
    tenantId: TENANT,
    title: "Parent",
    description: null,
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    createdByUserId: USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [],
    ...overrides,
  };
}

describe("AUFGABEN-01B subtasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          create: mocks.taskCreate,
          findFirstOrThrow: mocks.taskFindFirst,
          update: mocks.taskUpdate,
        },
        taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("rejects grandchild creation (max depth = 1)", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ id: CHILD, parentTaskId: PARENT }));
    await expect(
      createSubtask(ctx, CHILD, { title: "Grandchild" }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("creates subtask under root parent", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(taskRow())
      .mockResolvedValueOnce(
        taskRow({
          id: "sub-1",
          parentTaskId: PARENT,
          title: "Garderoben",
          assignees: [],
        }),
      );
    mocks.taskCreate.mockResolvedValue({ id: "sub-1" });
    mocks.tenantMembershipFindMany.mockResolvedValue([]);

    const dto = await createSubtask(ctx, PARENT, { title: "Garderoben" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentTaskId: PARENT,
          contextType: null,
          contextId: null,
        }),
      }),
    );
    expect(dto.parentTaskId).toBe(PARENT);
  });

  it("snapshots parent contextType/contextId on subtask create", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(
        taskRow({
          contextType: "MATCH",
          contextId: "match-ctx-1",
        }),
      )
      .mockResolvedValueOnce(
        taskRow({
          id: "sub-ctx",
          parentTaskId: PARENT,
          contextType: "MATCH",
          contextId: "match-ctx-1",
          assignees: [],
        }),
      );
    mocks.taskCreate.mockResolvedValue({ id: "sub-ctx" });
    mocks.tenantMembershipFindMany.mockResolvedValue([]);

    await createSubtask(ctx, PARENT, { title: "Follow-up" });
    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contextType: "MATCH",
          contextId: "match-ctx-1",
        }),
      }),
    );
  });

  it("derives parent progress from direct children", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([
      { status: TaskStatus.DONE },
      { status: TaskStatus.OPEN },
      { status: TaskStatus.CANCELLED },
    ]);
    const progress = await getTaskProgress(ctx, PARENT);
    expect(progress.label).toBe("1 / 2 erledigt");
  });
});

describe("AUFGABEN-01B listMyTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes assigned subtasks with parent context (batch parent load)", async () => {
    mocks.taskFindMany
      .mockResolvedValueOnce([
        {
          ...taskRow({ id: CHILD, parentTaskId: PARENT, title: "Gegner bestätigen" }),
          assignees: [
            {
              userId: USER,
              assignedAt: new Date(),
              user: { id: USER, firstName: "M", lastName: "X" },
            },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: PARENT,
          title: "Heimturnier F2",
          tenantId: TENANT,
          createdByUserId: USER,
          visibilityScope: "CLUB",
          orgUnitId: null,
          orgUnit: { tenantId: TENANT },
          assignees: [],
        },
      ]);

    const items = await listMyTasks(ctx, { openOnly: true });
    expect(items).toHaveLength(1);
    expect(items[0]?.parentTask).toEqual({ id: PARENT, title: "Heimturnier F2" });
  });
});

describe("AUFGABEN-01B recurrence identity", () => {
  it("builds deterministic occurrence keys", () => {
    expect(buildSeriesOccurrenceKey("series-1", "2026-09-21")).toBe(
      "series-1:2026-09-21",
    );
  });

  it("throws when an explicit series id is missing in tenant", async () => {
    mocks.taskSeriesFindMany.mockResolvedValue([]);
    await expect(generateTaskOccurrences(ctx, "missing-series")).rejects.toThrow();
  });
});
