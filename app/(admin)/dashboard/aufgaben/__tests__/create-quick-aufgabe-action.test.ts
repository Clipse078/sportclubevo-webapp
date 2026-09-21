import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getTaskServiceContext: vi.fn(),
  createQuickTask: vi.fn(),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: mocks.getTaskServiceContext,
}));

vi.mock("@/lib/tasks/task-service", () => ({
  createQuickTask: mocks.createQuickTask,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich" }),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createQuickAufgabeAction } from "../actions";

function viewOnlyCtx() {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
  };
}

describe("createQuickAufgabeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskServiceContext.mockResolvedValue(viewOnlyCtx());
    mocks.createQuickTask.mockResolvedValue({ id: "task-1" });
  });

  it("rejects crafted tenantId field", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    fd.set("tenantId", "evil");
    const result = await createQuickAufgabeAction(fd);
    expect(result.ok).toBe(false);
    expect(mocks.createQuickTask).not.toHaveBeenCalled();
  });

  it("rejects explicit empty assignee list", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    fd.set("assigneeUserIds", ",,,");
    const result = await createQuickAufgabeAction(fd);
    expect(result).toEqual({ ok: false, message: "Ungültige Zuweisung." });
  });

  it("defaults to self when assignee field omitted", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    const result = await createQuickAufgabeAction(fd);
    expect(result.ok).toBe(true);
    expect(mocks.createQuickTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ assigneeUserIds: ["user-1"] }),
    );
  });
});
