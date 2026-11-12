/**
 * SCE-TASK-01 — hierarchical tasks, parent progress, initiative leaf units.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  collectEligibleProgressLeafUnits,
  computeInitiativeProgressFromUnits,
  computeParentTaskProgress,
  deriveEffectiveParentStatus,
  isProgressEligibleStatus,
} from "../task-hierarchy-progress";
import { assertNotSubtaskParent } from "../subtask-rules";
import { ParentHasOpenSubtasksError, TaskValidationError } from "../errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskUpdate: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      update: mocks.taskUpdate,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
    tenant: { findUnique: vi.fn().mockResolvedValue({ locale: "de-CH", timezone: "Europe/Zurich" }) },
  },
}));

vi.mock("@/lib/club-development/initiative-progress-hooks", () => ({
  refreshInitiativeProgressForTaskContext: vi.fn(),
}));

import { completeTask, getTaskProgress, updateTask } from "../task-service";

const TENANT = "tenant-a";
const USER = "user-1";
const PARENT = "parent-1";

const ctx = {
  tenantId: TENANT,
  userId: USER,
  permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
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
    visibilityScope: "CLUB",
    createdByUserId: USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [],
    orgUnit: null,
    ...overrides,
  };
}

describe("SCE-TASK-01 task-hierarchy-progress", () => {
  it("standalone task without subtasks uses parent status for progress", () => {
    expect(
      computeParentTaskProgress({
        parentStatus: TaskStatus.DONE,
        subtasks: [],
      }).percent,
    ).toBe(100);
    expect(
      computeParentTaskProgress({
        parentStatus: TaskStatus.OPEN,
        subtasks: [],
      }).percent,
    ).toBe(0);
  });

  it("parent with subtasks rolls up eligible children only", () => {
    const rolled = computeParentTaskProgress({
      parentStatus: TaskStatus.OPEN,
      subtasks: [
        { status: TaskStatus.DONE },
        { status: TaskStatus.OPEN },
        { status: TaskStatus.CANCELLED },
      ],
    });
    expect(rolled.percent).toBe(50);
    expect(rolled.totalCount).toBe(2);
    expect(rolled.completedCount).toBe(1);
  });

  it("initiative leaf units exclude parent double-count", () => {
    const units = collectEligibleProgressLeafUnits([
      { id: "p1", status: TaskStatus.OPEN, parentTaskId: null },
      { id: "c1", status: TaskStatus.DONE, parentTaskId: "p1" },
      { id: "c2", status: TaskStatus.OPEN, parentTaskId: "p1" },
      { id: "solo", status: TaskStatus.DONE, parentTaskId: null },
    ]);
    expect(units.map((u) => u.id).sort()).toEqual(["c1", "c2", "solo"].sort());
    const snap = computeInitiativeProgressFromUnits(units);
    expect(snap.percent).toBe(67);
    expect(snap.completedCount).toBe(2);
    expect(snap.totalCount).toBe(3);
  });

  it("deduplicates across duplicate task rows in inputs", () => {
    const units = collectEligibleProgressLeafUnits([
      { id: "solo", status: TaskStatus.OPEN, parentTaskId: null },
      { id: "solo", status: TaskStatus.OPEN, parentTaskId: null },
    ]);
    expect(units).toHaveLength(1);
  });

  it("derived parent status reflects open subtasks", () => {
    expect(
      deriveEffectiveParentStatus(TaskStatus.DONE, [{ status: TaskStatus.OPEN }]),
    ).toBe(TaskStatus.OPEN);
    expect(
      deriveEffectiveParentStatus(TaskStatus.OPEN, [
        { status: TaskStatus.DONE },
        { status: TaskStatus.DONE },
      ]),
    ).toBe(TaskStatus.DONE);
  });

  it("cancelled subtasks are not progress-eligible", () => {
    expect(isProgressEligibleStatus(TaskStatus.CANCELLED)).toBe(false);
    expect(isProgressEligibleStatus(TaskStatus.DONE)).toBe(true);
  });

  it("prevents grandchild nesting", () => {
    expect(() => assertNotSubtaskParent({ parentTaskId: "x" })).toThrow(TaskValidationError);
  });
});

describe("SCE-TASK-01 task-service guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          update: mocks.taskUpdate,
          findFirstOrThrow: mocks.taskFindFirst,
          updateMany: vi.fn(),
        },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("blocks parent completion via updateTask when subtasks remain open", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([{ status: TaskStatus.OPEN }]);
    await expect(
      updateTask(ctx, PARENT, { status: TaskStatus.DONE }),
    ).rejects.toBeInstanceOf(ParentHasOpenSubtasksError);
  });

  it("reports parent progress from shared hierarchy logic", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(taskRow())
      .mockResolvedValueOnce({ status: TaskStatus.OPEN });
    mocks.taskFindMany.mockResolvedValue([
      { status: TaskStatus.DONE },
      { status: TaskStatus.OPEN },
    ]);
    const progress = await getTaskProgress(ctx, PARENT);
    expect(progress.percent).toBe(50);
    expect(progress.label).toBe("1 / 2 erledigt");
  });

  it("allows reopening a completed subtask", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        id: "child-1",
        parentTaskId: PARENT,
        status: TaskStatus.DONE,
      }),
    );
    mocks.taskUpdate.mockResolvedValue(
      taskRow({
        id: "child-1",
        parentTaskId: PARENT,
        status: TaskStatus.OPEN,
      }),
    );
    const dto = await updateTask(ctx, "child-1", { status: TaskStatus.OPEN });
    expect(dto.status).toBe(TaskStatus.OPEN);
  });

  it("completeTask still blocks parent with open children", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([{ status: TaskStatus.IN_PROGRESS }]);
    await expect(completeTask(ctx, PARENT)).rejects.toBeInstanceOf(ParentHasOpenSubtasksError);
  });
});
