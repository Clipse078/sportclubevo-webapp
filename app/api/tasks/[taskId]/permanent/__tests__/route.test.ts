import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ParentHasSubtasksForDeleteError } from "@/lib/tasks/errors";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getTaskServiceContext: vi.fn(),
  hasTenantDeletionAuthority: vi.fn(),
  getTaskDeletionImpact: vi.fn(),
  deleteTaskPermanently: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: mocks.getTaskServiceContext,
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasTenantDeletionAuthority: mocks.hasTenantDeletionAuthority,
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/tasks/task-delete-service", () => ({
  getTaskDeletionImpact: mocks.getTaskDeletionImpact,
  deleteTaskPermanently: mocks.deleteTaskPermanently,
}));

import { DELETE } from "../route";

const TASK_ID = "task-1";
const TENANT = "tenant-a";

function makeContext() {
  return { params: Promise.resolve({ taskId: TASK_ID }) };
}

function makeUrl(params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const qs = search.toString();
  return `http://localhost/api/tasks/${TASK_ID}/permanent${qs ? `?${qs}` : ""}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-1", effectiveUserId: "user-1" } });
  mocks.getTaskServiceContext.mockResolvedValue({
    tenantId: TENANT,
    userId: "user-1",
    permissionKeys: [PERMISSIONS.TASKS_DELETE],
  });
  mocks.getTaskDeletionImpact.mockResolvedValue({
    subtaskCount: 0,
    sprintMembershipCount: 0,
  });
});

describe("DELETE /api/tasks/[taskId]/permanent — PKG-03", () => {
  it("denies without tasks.delete authority", async () => {
    mocks.hasTenantDeletionAuthority.mockResolvedValueOnce(false);

    const response = await DELETE(new NextRequest(makeUrl({ confirm: "true" })), makeContext());
    expect(response.status).toBe(403);
    expect(mocks.deleteTaskPermanently).not.toHaveBeenCalled();
  });

  it("allows deletion with tasks.delete (tasks.manage not required)", async () => {
    mocks.getTaskServiceContext.mockResolvedValueOnce({
      tenantId: TENANT,
      userId: "user-1",
      permissionKeys: [PERMISSIONS.TASKS_DELETE],
    });
    mocks.hasTenantDeletionAuthority.mockResolvedValueOnce(true);
    mocks.deleteTaskPermanently.mockResolvedValueOnce({
      taskId: TASK_ID,
      title: "Leaf",
      impact: { subtaskCount: 0, sprintMembershipCount: 0 },
    });

    const response = await DELETE(
      new NextRequest(makeUrl({ confirm: "true", returnTo: "/vereinsleitung/sprints/x" })),
      makeContext(),
    );

    expect(response.status).toBe(200);
    expect(mocks.hasTenantDeletionAuthority).toHaveBeenCalledWith({
      userId: "user-1",
      permission: PERMISSIONS.TASKS_DELETE,
      tenantId: TENANT,
    });
    expect(mocks.deleteTaskPermanently).toHaveBeenCalled();
    const body = await response.json();
    expect(body.redirectTo).toBe("/vereinsleitung/sprints/x");
  });

  it("preview requires confirmation and reports parent subtask block", async () => {
    mocks.hasTenantDeletionAuthority.mockResolvedValueOnce(true);
    mocks.getTaskDeletionImpact.mockResolvedValueOnce({
      subtaskCount: 2,
      sprintMembershipCount: 0,
    });

    const response = await DELETE(new NextRequest(makeUrl()), makeContext());
    expect(response.status).toBe(400);
    expect(mocks.deleteTaskPermanently).not.toHaveBeenCalled();
  });

  it("maps ParentHasSubtasksForDeleteError on confirm", async () => {
    mocks.hasTenantDeletionAuthority.mockResolvedValueOnce(true);
    mocks.deleteTaskPermanently.mockRejectedValueOnce(new ParentHasSubtasksForDeleteError());

    const response = await DELETE(new NextRequest(makeUrl({ confirm: "true" })), makeContext());
    expect(response.status).toBe(400);
  });

  it("returns 401 without session", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const response = await DELETE(new NextRequest(makeUrl()), makeContext());
    expect(response.status).toBe(401);
    expect(mocks.hasTenantDeletionAuthority).not.toHaveBeenCalled();
  });
});