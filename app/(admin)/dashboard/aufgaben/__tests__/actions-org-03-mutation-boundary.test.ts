/**
 * AUFGABEN-05-ORG-03 — server actions forward validated org metadata to services.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getTaskServiceContext: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  createTaskSeries: vi.fn(),
  updateTaskSeries: vi.fn(),
  generateTaskOccurrences: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: mocks.getTaskServiceContext,
}));
vi.mock("@/lib/tasks/task-service", () => ({
  createTask: mocks.createTask,
  updateTask: mocks.updateTask,
  createSubtask: vi.fn(),
  assignTask: vi.fn(),
  completeTask: vi.fn(),
  cancelTask: vi.fn(),
}));
vi.mock("@/lib/tasks/task-series-service", () => ({
  createTaskSeries: mocks.createTaskSeries,
  updateTaskSeries: mocks.updateTaskSeries,
  generateTaskOccurrences: mocks.generateTaskOccurrences,
  pauseTaskSeries: vi.fn(),
  resumeTaskSeries: vi.fn(),
  endTaskSeries: vi.fn(),
}));

import {
  createAufgabeFullAction,
  updateAufgabeOrgVisibilityAction,
  createTaskSeriesAction,
  updateTaskSeriesAction,
} from "../actions";

const ctx = {
  tenantId: "tenant-a",
  userId: "user-1",
  permissionKeys: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TASKS_ASSIGN,
  ],
};

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("AUFGABEN-05-ORG-03 action mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskServiceContext.mockResolvedValue(ctx);
    mocks.createTask.mockResolvedValue({ id: "task-new" });
    mocks.updateTask.mockResolvedValue({ id: "task-1" });
    mocks.createTaskSeries.mockResolvedValue({ id: "series-new" });
    mocks.generateTaskOccurrences.mockResolvedValue(undefined);
    mocks.updateTaskSeries.mockResolvedValue({ id: "series-1" });
  });

  it("createAufgabeFullAction forwards orgUnitId / visibilityScope to createTask", async () => {
    await createAufgabeFullAction(
      form({
        title: "Scoped",
        visibilityScope: "ORG_UNIT",
        orgUnitId: "org-finance",
      }),
    );

    expect(mocks.createTask).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        orgUnitId: "org-finance",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
      }),
    );
  });

  it("updateAufgabeOrgVisibilityAction forwards org metadata", async () => {
    await updateAufgabeOrgVisibilityAction(
      form({
        taskId: "task-1",
        visibilityScope: "ASSIGNEES_ONLY",
        orgUnitId: "",
      }),
    );

    expect(mocks.updateTask).toHaveBeenCalledWith(
      ctx,
      "task-1",
      expect.objectContaining({
        orgUnitId: null,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      }),
    );
  });

  it("createTaskSeriesAction forwards org metadata", async () => {
    await createTaskSeriesAction(
      form({
        title: "Series",
        frequency: "WEEKLY",
        weekday: "MONDAY",
        timezone: "Europe/Zurich",
        visibilityScope: "CLUB",
      }),
    );

    expect(mocks.createTaskSeries).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        visibilityScope: TaskVisibilityScope.CLUB,
      }),
    );
  });

  it("updateTaskSeriesAction forwards org metadata when present", async () => {
    await updateTaskSeriesAction(
      form({
        seriesId: "series-1",
        visibilityScope: "ORG_UNIT",
        orgUnitId: "org-sport",
      }),
    );

    expect(mocks.updateTaskSeries).toHaveBeenCalledWith(
      ctx,
      "series-1",
      expect.objectContaining({
        orgUnitId: "org-sport",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
      }),
    );
  });
});
