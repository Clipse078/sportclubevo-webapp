/**
 * AUFGABEN-03C — occurrence generation hardening (concurrency + status transitions).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskSeriesStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskCreate: vi.fn(),
  taskAssigneeCreateMany: vi.fn(),
  taskSeriesFindMany: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  taskSeriesSubtaskFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
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
      create: mocks.taskCreate,
    },
    taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
    taskSeries: {
      findMany: mocks.taskSeriesFindMany,
      findFirst: mocks.taskSeriesFindFirst,
    },
    taskSeriesSubtaskTemplate: { findMany: mocks.taskSeriesSubtaskFindMany },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import {
  endTaskSeries,
  generateTaskOccurrencesInternal,
  resumeTaskSeries,
} from "../task-series-service";
import { TaskValidationError } from "../errors";

const TENANT = "tenant-a";
const USER = "user-mgr";
const SERIES_ID = "series-1";
const OCCURRENCE_ID = "occurrence-1";

const manageCtx = {
  tenantId: TENANT,
  userId: USER,
  permissionKeys: [PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW],
};

function activeSeries() {
  return {
    id: SERIES_ID,
    tenantId: TENANT,
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
    createdByUserId: USER,
    assigneeTemplates: [],
    subtaskTemplates: [],
  };
}

describe("AUFGABEN-03C concurrent occurrence insert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([activeSeries()]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          findFirst: mocks.taskFindFirst,
          create: mocks.taskCreate,
        },
        taskAssignee: { createMany: mocks.taskAssigneeCreateMany },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
    mocks.taskAssigneeCreateMany.mockResolvedValue({ count: 0 });
  });

  it("returns existing occurrence id when unique constraint races on insert", async () => {
    mocks.taskFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: OCCURRENCE_ID });
    mocks.taskCreate.mockRejectedValue({ code: "P2002" });

    const result = await generateTaskOccurrencesInternal(TENANT, USER, SERIES_ID);
    expect(result.generatedTaskIds).toContain(OCCURRENCE_ID);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-03C series status transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindFirst.mockResolvedValue(
      activeSeries(),
    );
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        taskSeries: {
          update: vi.fn().mockResolvedValue(activeSeries()),
        },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.auditCreate.mockResolvedValue({});
  });

  it("rejects resume when series is not PAUSED", async () => {
    await expect(resumeTaskSeries(manageCtx, SERIES_ID)).rejects.toBeInstanceOf(
      TaskValidationError,
    );
  });

  it("rejects end when series is already ENDED", async () => {
    mocks.taskSeriesFindFirst.mockResolvedValue({
      ...activeSeries(),
      status: TaskSeriesStatus.ENDED,
    });
    await expect(endTaskSeries(manageCtx, SERIES_ID)).rejects.toBeInstanceOf(
      TaskValidationError,
    );
  });
});
