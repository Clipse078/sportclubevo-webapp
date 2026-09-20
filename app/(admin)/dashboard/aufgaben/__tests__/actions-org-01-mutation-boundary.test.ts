/**
 * AUFGABEN-05-ORG-01 — server action boundary: org security metadata must not persist.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
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
  createAufgabeAction,
  createAufgabeFullAction,
  createTaskSeriesAction,
  updateAufgabeTitleAction,
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

describe("AUFGABEN-05-ORG-01 action mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskServiceContext.mockResolvedValue(ctx);
    mocks.createTask.mockResolvedValue({ id: "task-new" });
    mocks.updateTask.mockResolvedValue({ id: "task-1" });
    mocks.createTaskSeries.mockResolvedValue({ id: "series-new" });
    mocks.generateTaskOccurrences.mockResolvedValue(undefined);
    mocks.updateTaskSeries.mockResolvedValue({ id: "series-1" });
  });

  it("createAufgabeAction ignores injected orgUnitId / visibilityScope", async () => {
    await createAufgabeAction(
      form({
        title: "Injected",
        orgUnitId: "foreign-org",
        visibilityScope: "ASSIGNEES_ONLY",
      }),
    );

    expect(mocks.createTask).toHaveBeenCalledWith(
      ctx,
      expect.not.objectContaining({
        orgUnitId: expect.anything(),
        visibilityScope: expect.anything(),
      }),
    );
  });

  it("createAufgabeFullAction ignores injected org security fields", async () => {
    await createAufgabeFullAction(
      form({
        title: "Full create",
        orgUnitId: "foreign-org",
        visibilityScope: "ORG_UNIT",
      }),
    );

    expect(mocks.createTask).toHaveBeenCalledWith(
      ctx,
      expect.not.objectContaining({
        orgUnitId: expect.anything(),
        visibilityScope: expect.anything(),
      }),
    );
  });

  it("updateAufgabeTitleAction ignores injected org security fields", async () => {
    await updateAufgabeTitleAction(
      form({
        taskId: "task-1",
        title: "Renamed",
        orgUnitId: "foreign-org",
        visibilityScope: "ASSIGNEES_ONLY",
      }),
    );

    expect(mocks.updateTask).toHaveBeenCalledWith(
      ctx,
      "task-1",
      expect.not.objectContaining({
        orgUnitId: expect.anything(),
        visibilityScope: expect.anything(),
      }),
    );
  });

  it("createTaskSeriesAction ignores injected org security fields", async () => {
    await createTaskSeriesAction(
      form({
        title: "Series",
        frequency: "WEEKLY",
        weekday: "MONDAY",
        timezone: "Europe/Zurich",
        orgUnitId: "foreign-org",
        visibilityScope: "ORG_UNIT",
      }),
    );

    expect(mocks.createTaskSeries).toHaveBeenCalledWith(
      ctx,
      expect.not.objectContaining({
        orgUnitId: expect.anything(),
        visibilityScope: expect.anything(),
      }),
    );
  });

  it("updateTaskSeriesAction ignores injected org security fields", async () => {
    await updateTaskSeriesAction(
      form({
        seriesId: "series-1",
        title: "Updated series",
        orgUnitId: "foreign-org",
        visibilityScope: "ASSIGNEES_ONLY",
      }),
    );

    expect(mocks.updateTaskSeries).toHaveBeenCalledWith(
      ctx,
      "series-1",
      expect.not.objectContaining({
        orgUnitId: expect.anything(),
        visibilityScope: expect.anything(),
      }),
    );
  });
});
