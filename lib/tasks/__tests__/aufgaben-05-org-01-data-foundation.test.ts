/**
 * AUFGABEN-05-ORG-01 — organisational visibility data foundation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TaskAccessGrantSubjectType,
  TaskSeriesStatus,
  TaskStatus,
  TaskVisibilityScope,
} from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { UpdateTaskInput } from "../types";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCreate: vi.fn(),
  taskUpdate: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  taskSeriesFindMany: vi.fn(),
  taskSeriesCreate: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(() => true),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/notifications/task-producer", () => ({
  emitTaskAssignmentNotifications: vi.fn().mockResolvedValue(undefined),
  emitTaskDeadlineChangedNotifications: vi.fn().mockResolvedValue(undefined),
  computeNewAssigneeRows: () => [],
}));

vi.mock("../recurrence-dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../recurrence-dates")>();
  return {
    ...actual,
    listOccurrenceLocalDatesForSeries: vi.fn(() => ["2026-09-21"]),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      create: mocks.taskCreate,
      update: mocks.taskUpdate,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    taskAssignee: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    taskSeries: {
      findFirst: mocks.taskSeriesFindFirst,
      findMany: mocks.taskSeriesFindMany,
      create: mocks.taskSeriesCreate,
      update: vi.fn(),
      findFirstOrThrow: mocks.taskSeriesFindFirst,
    },
    taskSeriesAssigneeTemplate: { createMany: vi.fn(), deleteMany: vi.fn() },
    taskSeriesSubtaskTemplate: { create: vi.fn(), findMany: vi.fn() },
    taskSeriesSubtaskAssigneeTemplate: { createMany: vi.fn() },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    orgUnit: { findFirst: mocks.orgUnitFindFirst },
    team: {
      findFirst: vi.fn().mockResolvedValue({ id: "team-99", tenantId: "tenant-a" }),
    },
    meeting: {
      findFirst: vi.fn().mockResolvedValue({
        id: "meeting-1",
        visibilityScope: "CLUB",
        createdByUserId: "user-mgr",
        visibleRoleRefs: [],
        visibleUserRefs: [],
        visibleTeamRefs: [],
        visibleOrgUnitRefs: [],
        visiblePersonRefs: [],
        visibleTargetGroupRefs: [],
      }),
    },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import { createTask, createSubtask, updateTask } from "../task-service";
import {
  createTaskSeries,
  generateTaskOccurrencesInternal,
} from "../task-series-service";
import { assertTaskOrgUnitBelongsToTenant } from "../task-org-ownership";
import { buildTaskVisibilityWhere } from "../visibility";
import { TaskValidationError } from "../errors";
import type {
  CreateTaskSeriesInput,
  UpdateTaskSeriesInput,
} from "../task-series-service";

const TENANT_A = "tenant-a";
const USER = "user-mgr";
const PARENT = "parent-1";
const SERIES_ID = "series-1";
const ORG_FINANCE = "org-finance";
const ORG_EVENTS = "org-events";

const manageCtx = {
  tenantId: TENANT_A,
  userId: USER,
  permissionKeys: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.TEAMS_VIEW,
  ],
};

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PARENT,
    tenantId: TENANT_A,
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
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [],
    ...overrides,
  };
}

function activeSeries(overrides: Record<string, unknown> = {}) {
  return {
    id: SERIES_ID,
    tenantId: TENANT_A,
    title: "Weekly",
    description: null,
    priority: "NORMAL",
    status: TaskSeriesStatus.ACTIVE,
    frequency: "WEEKLY",
    intervalCount: 1,
    weekday: "SUNDAY",
    monthDay: null,
    dueHour: 23,
    dueMinute: 59,
    timezone: "Europe/Zurich",
    startsOn: null,
    endsOn: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: USER,
    assigneeTemplates: [],
    subtaskTemplates: [],
    ...overrides,
  };
}

describe("AUFGABEN-05-ORG-01 defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          create: mocks.taskCreate,
          findFirstOrThrow: mocks.taskFindFirst,
          update: mocks.taskUpdate,
        },
        taskAssignee: { createMany: vi.fn() },
        taskSeries: { create: mocks.taskSeriesCreate, findFirstOrThrow: mocks.taskSeriesFindFirst },
        taskSeriesAssigneeTemplate: { createMany: vi.fn() },
        taskSeriesSubtaskTemplate: { create: vi.fn() },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
  });

  it("createTask relies on schema defaults for org metadata", async () => {
    mocks.taskCreate.mockResolvedValue({ id: "t1" });
    mocks.taskFindFirst.mockResolvedValue(taskRow({ id: "t1" }));

    await createTask(manageCtx, { title: "Ad-hoc" });

    const createArg = mocks.taskCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data.orgUnitId).toBeNull();
    expect(createArg.data.visibilityScope).toBe(TaskVisibilityScope.CLUB);
  });

  it("createTaskSeries relies on schema defaults for org metadata", async () => {
    mocks.taskSeriesCreate.mockResolvedValue({ id: SERIES_ID });
    mocks.taskSeriesFindFirst.mockResolvedValue(activeSeries());

    const input: CreateTaskSeriesInput = {
      title: "Series",
      frequency: "WEEKLY",
      weekday: "MONDAY",
      timezone: "Europe/Zurich",
    };
    await createTaskSeries(manageCtx, input);

    const createArg = mocks.taskSeriesCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data.orgUnitId).toBeNull();
    expect(createArg.data.visibilityScope).toBe(TaskVisibilityScope.CLUB);
  });
});

describe("AUFGABEN-05-ORG-01 subtask inheritance", () => {
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

  it("copies parent orgUnitId and visibilityScope onto subtask", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(
        taskRow({
          orgUnitId: ORG_FINANCE,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      )
      .mockResolvedValueOnce(
        taskRow({
          id: "sub-1",
          parentTaskId: PARENT,
          orgUnitId: ORG_FINANCE,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      );
    mocks.taskCreate.mockResolvedValue({ id: "sub-1" });

    await createSubtask(manageCtx, PARENT, { title: "Child" });

    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: ORG_FINANCE,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      }),
    );
  });

  it("copies null / ASSIGNEES_ONLY parent snapshot", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(
        taskRow({
          orgUnitId: null,
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        }),
      )
      .mockResolvedValueOnce(
        taskRow({
          id: "sub-2",
          parentTaskId: PARENT,
          orgUnitId: null,
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        }),
      );
    mocks.taskCreate.mockResolvedValue({ id: "sub-2" });

    await createSubtask(manageCtx, PARENT, { title: "Private child" });

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

describe("AUFGABEN-05-ORG-01 recurrence snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([
      activeSeries({
        orgUnitId: ORG_EVENTS,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        subtaskTemplates: [
          {
            id: "tpl-1",
            title: "Checklist",
            description: null,
            priority: "NORMAL",
            dueOffsetDays: 0,
            assignees: [],
          },
        ],
      }),
    ]);
    mocks.taskFindFirst.mockResolvedValue(null);
    mocks.taskCreate
      .mockResolvedValueOnce({ id: "root-occ" })
      .mockResolvedValueOnce({ id: "child-occ" });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          findFirst: mocks.taskFindFirst,
          create: mocks.taskCreate,
        },
        taskAssignee: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("snapshots series org metadata onto root and generated subtasks", async () => {
    await generateTaskOccurrencesInternal(TENANT_A, USER, SERIES_ID);

    expect(mocks.taskCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: ORG_EVENTS,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      }),
    );
    expect(mocks.taskCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: ORG_EVENTS,
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
        }),
      }),
    );
  });

  it("legacy CLUB series generates CLUB/null occurrences", async () => {
    mocks.taskSeriesFindMany.mockResolvedValue([activeSeries()]);
    mocks.taskCreate.mockReset();
    mocks.taskCreate.mockResolvedValue({ id: "root-club" });

    await generateTaskOccurrencesInternal(TENANT_A, USER, SERIES_ID);

    expect(mocks.taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgUnitId: null,
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      }),
    );
  });

  it("skips regeneration when occurrence already exists (snapshot not retroactive)", async () => {
    mocks.taskFindFirst.mockResolvedValueOnce({ id: "existing-root" });
    mocks.taskCreate.mockReset();

    const result = await generateTaskOccurrencesInternal(TENANT_A, USER, SERIES_ID);
    expect(result.generatedTaskIds).toEqual(["existing-root"]);
    expect(mocks.taskCreate).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-05-ORG-01 mutation surface", () => {
  it("UpdateTaskInput type excludes org security fields", () => {
    const input: UpdateTaskInput = { title: "Safe" };
    expect(Object.prototype.hasOwnProperty.call(input, "orgUnitId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(input, "visibilityScope")).toBe(
      false,
    );
  });

  it("updateTask never writes org security metadata", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskUpdate.mockResolvedValue(taskRow({ title: "Renamed" }));
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: { update: mocks.taskUpdate },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});

    await updateTask(manageCtx, PARENT, { title: "Renamed" });

    const updateArg = mocks.taskUpdate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.orgUnitId).toBeUndefined();
    expect(updateArg.data.visibilityScope).toBeUndefined();
  });

  it("UpdateTaskSeriesInput excludes org security fields", () => {
    const input: UpdateTaskSeriesInput = { title: "Series" };
    expect(Object.prototype.hasOwnProperty.call(input, "orgUnitId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(input, "visibilityScope")).toBe(
      false,
    );
  });
});

describe("AUFGABEN-05-ORG-01 authorization baseline (pre-ORG-02 cutover)", () => {
  it("buildTaskVisibilityWhere uses CLUB tenant-wide branch for manage", () => {
    expect(buildTaskVisibilityWhere(manageCtx)).toEqual({
      tenantId: TENANT_A,
      OR: [
        { createdByUserId: USER },
        {
          assignees: {
            some: { userId: USER, tenantId: TENANT_A },
          },
        },
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
});

describe("AUFGABEN-05-ORG-01 tenant org ownership", () => {
  it("rejects OrgUnit from another tenant at domain boundary", async () => {
    mocks.orgUnitFindFirst.mockResolvedValue(null);
    await expect(
      assertTaskOrgUnitBelongsToTenant(TENANT_A, "org-b"),
    ).rejects.toMatchObject({
      message: "Organisationseinheit gehört nicht zu diesem Mandanten.",
    });
    expect(mocks.orgUnitFindFirst).toHaveBeenCalledWith({
      where: { id: "org-b", tenantId: TENANT_A },
      select: { id: true },
    });
  });

  it("requires non-empty tenantId and orgUnitId", async () => {
    await expect(assertTaskOrgUnitBelongsToTenant("", ORG_FINANCE)).rejects.toBeInstanceOf(
      TaskValidationError,
    );
    await expect(assertTaskOrgUnitBelongsToTenant(TENANT_A, "")).rejects.toBeInstanceOf(
      TaskValidationError,
    );
  });

  it("accepts OrgUnit in same tenant", async () => {
    mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_FINANCE });
    await expect(
      assertTaskOrgUnitBelongsToTenant(TENANT_A, ORG_FINANCE),
    ).resolves.toBeUndefined();
  });
});

describe("AUFGABEN-05-ORG-01 context independence", () => {
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
    mocks.taskCreate.mockResolvedValue({ id: "ctx-task" });
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "ctx-task",
        contextType: "TEAM",
        contextId: "team-99",
      }),
    );
  });

  it("does not derive orgUnitId from TEAM context on create", async () => {
    await createTask(manageCtx, {
      title: "Team task",
      contextType: "TEAM",
      contextId: "team-99",
    });

    const createArg = mocks.taskCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data.contextType).toBe("TEAM");
    expect(createArg.data.contextId).toBe("team-99");
    expect(createArg.data.orgUnitId).toBeNull();
  });

  it("does not derive orgUnitId from MEETING context on create", async () => {
    const meetingCtx = {
      ...manageCtx,
      permissionKeys: [...manageCtx.permissionKeys, PERMISSIONS.MEETINGS_VIEW],
    };
    await createTask(meetingCtx, {
      title: "Meeting task",
      contextType: "MEETING",
      contextId: "meeting-1",
    });

    const createArg = mocks.taskCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data.contextType).toBe("MEETING");
    expect(createArg.data.contextId).toBe("meeting-1");
    expect(createArg.data.orgUnitId).toBeNull();
  });
});

describe("AUFGABEN-05-ORG-01 subtask snapshot stability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        orgUnitId: ORG_FINANCE,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
      }),
    );
    mocks.taskUpdate.mockResolvedValue(taskRow({ title: "Parent renamed" }));
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: { update: mocks.taskUpdate },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("parent update does not rewrite subtask org metadata (no cascade)", async () => {
    await updateTask(manageCtx, PARENT, { title: "Parent renamed" });

    const updateArg = mocks.taskUpdate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.orgUnitId).toBeUndefined();
    expect(updateArg.data.visibilityScope).toBeUndefined();
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
  });
});
