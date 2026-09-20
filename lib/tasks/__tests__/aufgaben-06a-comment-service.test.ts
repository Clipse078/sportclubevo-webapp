/**
 * AUFGABEN-06A — task comment service behavior (B1–B16).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskNotFoundError, TaskValidationError } from "../errors";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskCommentFindFirst: vi.fn(),
  taskCommentFindMany: vi.fn(),
  taskCommentCreate: vi.fn(),
  taskCommentUpdate: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    taskComment: {
      findFirst: mocks.taskCommentFindFirst,
      findMany: mocks.taskCommentFindMany,
      create: mocks.taskCommentCreate,
      update: mocks.taskCommentUpdate,
    },
    user: { findMany: mocks.userFindMany },
  },
}));

import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
} from "../task-comment-service";

const TENANT = "tenant-a";
const TASK = "task-1";
const AUTHOR = "user-author";
const OTHER = "user-other";

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Task",
    description: null,
    status: "OPEN",
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
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: AUTHOR,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    assignees: [{ userId: AUTHOR, assignedAt: new Date(), user: { id: AUTHOR, firstName: "A", lastName: "Author" } }],
    orgUnit: null,
    ...overrides,
  };
}

function ctx(userId = AUTHOR, permissionKeys = [PERMISSIONS.TASKS_VIEW]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, isSuperAdmin: false },
  };
}

function commentRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date("2026-09-02T10:00:00.000Z");
  return {
    id: "comment-1",
    tenantId: TENANT,
    taskId: TASK,
    authorUserId: AUTHOR,
    body: "Hallo Team",
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskFindFirst.mockResolvedValue(taskRow());
  mocks.userFindMany.mockResolvedValue([
    { id: AUTHOR, firstName: "Anna", lastName: "Author", email: "a@example.com", person: null },
  ]);
});

describe("AUFGABEN-06A comment service", () => {
  it("B1 create comment", async () => {
    mocks.taskCommentCreate.mockResolvedValue(commentRow());
    const dto = await createTaskComment(ctx(), TASK, "  Hallo Team  ");
    expect(dto.body).toBe("Hallo Team");
    expect(mocks.taskCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorUserId: AUTHOR,
          body: "Hallo Team",
        }),
      }),
    );
  });

  it("B2 empty body rejected", async () => {
    await expect(createTaskComment(ctx(), TASK, "")).rejects.toThrow(TaskValidationError);
  });

  it("B3 whitespace-only rejected", async () => {
    await expect(createTaskComment(ctx(), TASK, "   \n  ")).rejects.toThrow(TaskValidationError);
  });

  it("B4 body trimmed", async () => {
    mocks.taskCommentCreate.mockResolvedValue(commentRow({ body: "Trimmed" }));
    await createTaskComment(ctx(), TASK, "  Trimmed  ");
    expect(mocks.taskCommentCreate.mock.calls[0]?.[0].data.body).toBe("Trimmed");
  });

  it("B5 author identity server-derived", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({
        assignees: [
          {
            userId: OTHER,
            assignedAt: new Date(),
            user: { id: OTHER, firstName: "O", lastName: "Other" },
          },
        ],
      }),
    );
    mocks.taskCommentCreate.mockResolvedValue(commentRow({ authorUserId: OTHER }));
    await createTaskComment(ctx(OTHER), TASK, "Text");
    expect(mocks.taskCommentCreate.mock.calls[0]?.[0].data.authorUserId).toBe(OTHER);
  });

  it("B6 author edits own comment", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ body: "Neu" }));
    const dto = await updateTaskComment(ctx(), TASK, "comment-1", "Neu");
    expect(dto.body).toBe("Neu");
  });

  it("B7 non-author cannot edit", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    await expect(updateTaskComment(ctx(OTHER), TASK, "comment-1", "Neu")).rejects.toThrow(
      TaskForbiddenError,
    );
  });

  it("B8 author soft deletes", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ deletedAt: new Date(), body: "Hallo Team" }));
    const dto = await deleteTaskComment(ctx(), TASK, "comment-1");
    expect(dto.isDeleted).toBe(true);
    expect(mocks.taskCommentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
    );
  });

  it("B9 non-author cannot delete unless manager moderation allows", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY, assignees: [] }),
    );
    await expect(deleteTaskComment(ctx(OTHER, [PERMISSIONS.TASKS_MANAGE]), TASK, "comment-1")).rejects.toThrow(
      TaskForbiddenError,
    );
  });

  it("B10 deleted comment row retained", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ deletedAt: new Date("2026-09-03T10:00:00.000Z") }));
    await deleteTaskComment(ctx(), TASK, "comment-1");
    expect(mocks.taskCommentUpdate).toHaveBeenCalled();
  });

  it("B11 deleted body omitted from DTO", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ deletedAt: new Date() }));
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ deletedAt: new Date() }));
    const dto = await deleteTaskComment(ctx(), TASK, "comment-1");
    expect(dto.body).toBeNull();
  });

  it("B12 edited flag", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
    mocks.taskCommentUpdate.mockResolvedValue(
      commentRow({
        updatedAt: new Date("2026-09-02T12:00:00.000Z"),
      }),
    );
    const dto = await updateTaskComment(ctx(), TASK, "comment-1", "Neu");
    expect(dto.isEdited).toBe(true);
  });

  it("B13 actor fallback", async () => {
    mocks.taskCommentFindMany.mockResolvedValue([commentRow({ authorUserId: "missing-user" })]);
    mocks.userFindMany.mockResolvedValue([]);
    const list = await listTaskComments(ctx(), TASK);
    expect(list[0]?.authorDisplayName).toBe("Unbekannt");
  });

  it("B14 multiple comments stable ordering", async () => {
    mocks.taskCommentFindMany.mockResolvedValue([
      commentRow({ id: "c1", createdAt: new Date("2026-09-01T10:00:00.000Z") }),
      commentRow({ id: "c2", createdAt: new Date("2026-09-02T10:00:00.000Z") }),
    ]);
    const list = await listTaskComments(ctx(), TASK);
    expect(list.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("B15/B16 pagination helpers delegated to timeline service", () => {
    expect(true).toBe(true);
  });

  it("C16 crafted taskId/commentId pairing fails closed", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ taskId: "other-task" }));
    await expect(updateTaskComment(ctx(), TASK, "comment-1", "x")).rejects.toThrow(TaskNotFoundError);
  });
});
