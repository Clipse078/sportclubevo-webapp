/**
 * AUFGABEN-05-ORG-01 — legacy action boundary (non-org field actions).
 *
 * Org/visibility forwarding is covered in actions-org-03-mutation-boundary.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getTaskServiceContext: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
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

import { createAufgabeAction, updateAufgabeTitleAction } from "../actions";

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
  });

  it("createAufgabeAction without org fields does not send org metadata", async () => {
    await createAufgabeAction(
      form({
        title: "Simple",
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
});
