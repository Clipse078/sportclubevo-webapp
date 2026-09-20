/**
 * AUFGABEN-03B — recurring series workspace, labels, generation semantics.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskSeriesStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskCount: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  taskSeriesFindMany: vi.fn(),
  taskSeriesCreate: vi.fn(),
  taskSeriesUpdate: vi.fn(),
  taskSeriesAssigneeDeleteMany: vi.fn(),
  taskSeriesAssigneeCreateMany: vi.fn(),
  taskSeriesSubtaskFindMany: vi.fn(),
  taskSeriesSubtaskCreate: vi.fn(),
  taskSeriesSubtaskDeleteMany: vi.fn(),
  taskSeriesSubtaskAssigneeDeleteMany: vi.fn(),
  taskSeriesSubtaskAssigneeCreateMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  userFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
      count: mocks.taskCount,
      create: vi.fn(),
    },
    taskAssignee: { createMany: vi.fn() },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    taskSeries: {
      findFirst: mocks.taskSeriesFindFirst,
      findMany: mocks.taskSeriesFindMany,
      create: mocks.taskSeriesCreate,
      update: mocks.taskSeriesUpdate,
      findFirstOrThrow: mocks.taskSeriesFindFirst,
    },
    taskSeriesAssigneeTemplate: {
      deleteMany: mocks.taskSeriesAssigneeDeleteMany,
      createMany: mocks.taskSeriesAssigneeCreateMany,
    },
    taskSeriesSubtaskTemplate: {
      findMany: mocks.taskSeriesSubtaskFindMany,
      create: mocks.taskSeriesSubtaskCreate,
      deleteMany: mocks.taskSeriesSubtaskDeleteMany,
    },
    taskSeriesSubtaskAssigneeTemplate: {
      deleteMany: mocks.taskSeriesSubtaskAssigneeDeleteMany,
      createMany: mocks.taskSeriesSubtaskAssigneeCreateMany,
    },
    user: { findMany: mocks.userFindMany },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import {
  formatSubtaskDueOffsetDays,
  formatTaskSeriesRecurrenceLabel,
} from "../management-labels";
import { buildSeriesOccurrenceKey, getNextScheduledOccurrenceLocalDate } from "../recurrence-dates";
import {
  createTaskSeries,
  generateTaskOccurrences,
  pauseTaskSeries,
  updateTaskSeries,
} from "../task-series-service";
import { TaskValidationError } from "../errors";

const TENANT = "tenant-a";
const USER = "user-mgr";
const SERIES_ID = "series-1";

const manageCtx = {
  tenantId: TENANT,
  userId: USER,
  permissionKeys: [PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW],
};

function seriesRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SERIES_ID,
    tenantId: TENANT,
    title: "Wochenplan kontrollieren",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    assigneeTemplates: [],
    subtaskTemplates: [],
    ...overrides,
  };
}

describe("AUFGABEN-03B presentation", () => {
  it("formats weekly and monthly recurrence in German", () => {
    expect(
      formatTaskSeriesRecurrenceLabel({
        frequency: "WEEKLY",
        intervalCount: 1,
        weekday: "SUNDAY",
        monthDay: null,
      }),
    ).toBe("Jeden Sonntag");
    expect(
      formatTaskSeriesRecurrenceLabel({
        frequency: "WEEKLY",
        intervalCount: 2,
        weekday: "MONDAY",
        monthDay: null,
      }),
    ).toBe("Alle 2 Wochen · Montag");
    expect(
      formatTaskSeriesRecurrenceLabel({
        frequency: "MONTHLY",
        intervalCount: 1,
        monthDay: 1,
        weekday: null,
      }),
    ).toBe("Jeden Monat · am 1.");
  });

  it("formats subtask due offsets", () => {
    expect(formatSubtaskDueOffsetDays(-2)).toBe("2 Tage vorher");
    expect(formatSubtaskDueOffsetDays(1)).toBe("1 Tag danach");
    expect(formatSubtaskDueOffsetDays(0)).toBe("Am Serientermin");
  });
});

describe("AUFGABEN-03B validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: USER }]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      taskSeries: {
        create: mocks.taskSeriesCreate,
        update: mocks.taskSeriesUpdate,
        findFirstOrThrow: mocks.taskSeriesFindFirst,
      },
      taskSeriesAssigneeTemplate: {
        deleteMany: mocks.taskSeriesAssigneeDeleteMany,
        createMany: mocks.taskSeriesAssigneeCreateMany,
      },
      taskSeriesSubtaskTemplate: {
        findMany: mocks.taskSeriesSubtaskFindMany,
        create: mocks.taskSeriesSubtaskCreate,
        deleteMany: mocks.taskSeriesSubtaskDeleteMany,
      },
      taskSeriesSubtaskAssigneeTemplate: {
        deleteMany: mocks.taskSeriesSubtaskAssigneeDeleteMany,
        createMany: mocks.taskSeriesSubtaskAssigneeCreateMany,
      },
      auditLog: { create: mocks.auditCreate },
    }));
    mocks.auditCreate.mockResolvedValue({});
  });

  it("rejects invalid month day on create", async () => {
    await expect(
      createTaskSeries(manageCtx, {
        title: "X",
        frequency: "MONTHLY",
        monthDay: 29,
        timezone: "Europe/Zurich",
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("rejects weekly series without weekday", async () => {
    await expect(
      createTaskSeries(manageCtx, {
        title: "X",
        frequency: "WEEKLY",
        timezone: "Europe/Zurich",
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("rejects empty title on create", async () => {
    await expect(
      createTaskSeries(manageCtx, {
        title: "   ",
        frequency: "WEEKLY",
        weekday: "MONDAY",
        timezone: "Europe/Zurich",
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("rejects non-positive interval on create", async () => {
    await expect(
      createTaskSeries(manageCtx, {
        title: "X",
        frequency: "WEEKLY",
        weekday: "MONDAY",
        intervalCount: 0,
        timezone: "Europe/Zurich",
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });
});

describe("AUFGABEN-03B resume horizon", () => {
  it("derives next occurrence from now (no historical backfill semantics in date engine)", () => {
    const now = new Date("2026-09-20T10:00:00.000Z");
    const next = getNextScheduledOccurrenceLocalDate(
      {
        frequency: "WEEKLY",
        intervalCount: 1,
        weekday: "SUNDAY",
        monthDay: null,
        timezone: "Europe/Zurich",
        startsOn: null,
        endsOn: null,
      },
      now,
    );
    expect(next).toBe("2026-09-20");
  });
});

describe("AUFGABEN-03B status + generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindFirst.mockResolvedValue(seriesRow());
    mocks.taskSeriesFindMany.mockResolvedValue([seriesRow()]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      taskSeries: { update: mocks.taskSeriesUpdate },
      auditLog: { create: mocks.auditCreate },
    }));
    mocks.taskSeriesUpdate.mockResolvedValue(seriesRow({ status: TaskSeriesStatus.PAUSED }));
    mocks.auditCreate.mockResolvedValue({});
  });

  it("pause keeps series in tenant scope", async () => {
    await pauseTaskSeries(manageCtx, SERIES_ID);
    expect(mocks.taskSeriesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: TaskSeriesStatus.PAUSED },
      }),
    );
  });

  it("uses canonical occurrence keys", () => {
    expect(buildSeriesOccurrenceKey(SERIES_ID, "2026-09-21")).toBe(`${SERIES_ID}:2026-09-21`);
  });
});

describe("AUFGABEN-03B edit template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindFirst.mockResolvedValue(seriesRow());
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    mocks.taskSeriesSubtaskFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      taskSeries: {
        update: mocks.taskSeriesUpdate,
        findFirstOrThrow: mocks.taskSeriesFindFirst,
      },
      taskSeriesAssigneeTemplate: {
        deleteMany: mocks.taskSeriesAssigneeDeleteMany,
        createMany: mocks.taskSeriesAssigneeCreateMany,
      },
      taskSeriesSubtaskTemplate: {
        findMany: mocks.taskSeriesSubtaskFindMany,
        create: mocks.taskSeriesSubtaskCreate,
        deleteMany: mocks.taskSeriesSubtaskDeleteMany,
      },
      taskSeriesSubtaskAssigneeTemplate: {
        deleteMany: mocks.taskSeriesSubtaskAssigneeDeleteMany,
        createMany: mocks.taskSeriesSubtaskAssigneeCreateMany,
      },
      auditLog: { create: mocks.auditCreate },
    }));
    mocks.taskSeriesUpdate.mockResolvedValue(seriesRow({ title: "Neu" }));
    mocks.taskSeriesFindFirst.mockResolvedValue(seriesRow({ title: "Neu" }));
    mocks.auditCreate.mockResolvedValue({});
  });

  it("updates series title without touching occurrences (service-level)", async () => {
    await updateTaskSeries(manageCtx, SERIES_ID, { title: "Neu" });
    expect(mocks.taskSeriesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Neu" }),
      }),
    );
    expect(mocks.taskFindMany).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-03B generation idempotency entry", () => {
  it("requires manage permission for interactive generation", async () => {
    mocks.taskSeriesFindMany.mockResolvedValue([]);
    await expect(
      generateTaskOccurrences(
        { tenantId: TENANT, userId: USER, permissionKeys: [PERMISSIONS.TASKS_VIEW] },
        SERIES_ID,
      ),
    ).rejects.toThrow();
  });
});
