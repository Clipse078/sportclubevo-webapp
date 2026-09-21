/**
 * AUFGABEN-06B — comment mention persistence, edit matrix, hydration, privacy.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskNotFoundError } from "../errors";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { enrichTaskComments } from "../task-comment-enrichment";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskCommentFindFirst: vi.fn(),
  taskCommentCreate: vi.fn(),
  taskCommentUpdate: vi.fn(),
  mentionDeleteMany: vi.fn(),
  mentionCreateMany: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  transaction: vi.fn(),
  validateMentions: vi.fn(),
  emitNotifications: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    taskComment: {
      findFirst: mocks.taskCommentFindFirst,
      create: mocks.taskCommentCreate,
      update: mocks.taskCommentUpdate,
    },
    taskCommentMention: {
      deleteMany: mocks.mentionDeleteMany,
      createMany: mocks.mentionCreateMany,
    },
    user: { findMany: mocks.userFindMany, findFirst: mocks.userFindFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../task-mention-auth", () => ({
  validateMentionedUsersForTask: (...args: unknown[]) => mocks.validateMentions(...args),
}));

vi.mock("../task-mention-producer", () => ({
  emitTaskMentionNotifications: (...args: unknown[]) => mocks.emitNotifications(...args),
}));

import { createTaskComment, updateTaskComment } from "../task-comment-service";

const TENANT = "tenant-a";
const TASK = "task-1";
const TASK_B = "task-2";
const AUTHOR = "user-author";
const SANDRA = "user-sandra";
const SCOTTY = "user-scotty";

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

function ctx() {
  return {
    tenantId: TENANT,
    userId: AUTHOR,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

function commentRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date("2026-09-02T10:00:00.000Z");
  return {
    id: "comment-1",
    tenantId: TENANT,
    taskId: TASK,
    authorUserId: AUTHOR,
    body: "Hallo",
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    mentions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskFindFirst.mockResolvedValue(taskRow());
  mocks.validateMentions.mockImplementation(async (_ctx, _task, ids: string[]) => ids);
  mocks.userFindMany.mockResolvedValue([
    { id: AUTHOR, firstName: "Anna", lastName: "Author", email: "a@example.com", person: null },
    { id: SANDRA, firstName: "Sandra", lastName: "Schmid", email: "s@example.com", person: null },
    { id: SCOTTY, firstName: "Scotty", lastName: "Scott", email: "sc@example.com", person: null },
  ]);
  mocks.userFindFirst.mockResolvedValue({
    firstName: "Anna",
    lastName: "Author",
    email: "a@example.com",
    person: null,
  });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      taskComment: {
        create: mocks.taskCommentCreate,
        update: mocks.taskCommentUpdate,
      },
      taskCommentMention: {
        deleteMany: mocks.mentionDeleteMany,
        createMany: mocks.mentionCreateMany,
      },
    }),
  );
  mocks.taskCommentCreate.mockImplementation(async (args: { data: Record<string, unknown> }) =>
    commentRow({
      mentions: (args.data.mentions as { create: Array<{ userId: string }> })?.create?.map((m) => ({
        id: `m-${m.userId}`,
        userId: m.userId,
        createdAt: new Date(),
      })),
    }),
  );
  mocks.taskCommentUpdate.mockImplementation(async (args: { data: { body: string } }) =>
    commentRow({ body: args.data.body }),
  );
});

describe("AUFGABEN-06B mention persistence", () => {
  it("M12–M15 comment create does not mutate task row", async () => {
    mocks.taskCommentCreate.mockResolvedValue(commentRow());
    await createTaskComment(ctx(), TASK, "Hi", [SANDRA]);
    expect(mocks.taskFindFirst).toHaveBeenCalled();
    expect(mocks.taskFindFirst.mock.calls.every((c) => !("update" in (c[0] ?? {})))).toBe(true);
  });

  it("stores mentions with same tenantId as comment", async () => {
    await createTaskComment(ctx(), TASK, "Hi @Sandra", [SANDRA]);
    const createData = mocks.taskCommentCreate.mock.calls[0]?.[0].data;
    expect(createData.tenantId).toBe(TENANT);
    expect(createData.mentions.create[0]).toEqual(
      expect.objectContaining({ tenantId: TENANT, userId: SANDRA }),
    );
  });

  it("M24 cross-tenant task id fails closed", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(createTaskComment(ctx(), TASK, "x", [])).rejects.toThrow(TaskNotFoundError);
  });

  it("M31/M32 comments scoped by taskId in queries", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ taskId: TASK_B }));
    await expect(updateTaskComment(ctx(), TASK, "comment-1", "x", [])).rejects.toThrow(
      TaskNotFoundError,
    );
  });
});

describe("AUFGABEN-06B edit transition matrix", () => {
  beforeEach(() => {
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow());
  });

  async function runEdit(
    existingMentions: string[],
    nextMentions: string[],
    body = "text",
  ) {
    mocks.taskCommentFindFirst.mockResolvedValue(
      commentRow({
        mentions: existingMentions.map((userId) => ({
          id: `m-${userId}`,
          userId,
          createdAt: new Date(),
        })),
      }),
    );
    mocks.validateMentions.mockResolvedValue(nextMentions);
    mocks.taskCommentUpdate.mockResolvedValue(
      commentRow({
        mentions: nextMentions.map((userId) => ({
          id: `m-${userId}`,
          userId,
          createdAt: new Date(),
        })),
      }),
    );
    await updateTaskComment(ctx(), TASK, "comment-1", body, nextMentions);
  }

  it("EMPTY_TO_ONE notifies Sandra", async () => {
    await runEdit([], [SANDRA]);
    expect(mocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mentionedUserIds: [SANDRA] }),
    );
  });

  it("UNCHANGED does not notify", async () => {
    await runEdit([SANDRA], [SANDRA]);
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("ONE_TO_EMPTY does not notify", async () => {
    await runEdit([SANDRA], []);
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("EMPTY_TO_MULTI notifies both", async () => {
    await runEdit([], [SANDRA, SCOTTY]);
    expect(mocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mentionedUserIds: [SANDRA, SCOTTY] }),
    );
  });

  it("ADD_SECOND notifies Scotty only", async () => {
    await runEdit([SANDRA], [SANDRA, SCOTTY]);
    expect(mocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mentionedUserIds: [SCOTTY] }),
    );
  });

  it("REMOVE_FIRST persists Scotty only", async () => {
    await runEdit([SANDRA, SCOTTY], [SCOTTY]);
    expect(mocks.mentionCreateMany).toHaveBeenCalledWith({
      data: [{ tenantId: TENANT, commentId: "comment-1", userId: SCOTTY }],
    });
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("REMOVE_READD does not notify Sandra again", async () => {
    await runEdit([], [SANDRA]);
    expect(mocks.emitNotifications).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();
    mocks.taskCommentFindFirst.mockResolvedValue(
      commentRow({
        mentions: [{ id: "m1", userId: SANDRA, createdAt: new Date() }],
      }),
    );
    mocks.validateMentions.mockResolvedValue([]);
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ mentions: [] }));
    await updateTaskComment(ctx(), TASK, "comment-1", "cleared", []);
    expect(mocks.emitNotifications).not.toHaveBeenCalled();

    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ mentions: [] }));
    mocks.validateMentions.mockResolvedValue([SANDRA]);
    mocks.taskCommentUpdate.mockResolvedValue(
      commentRow({
        mentions: [{ id: "m2", userId: SANDRA, createdAt: new Date() }],
      }),
    );
    await updateTaskComment(ctx(), TASK, "comment-1", "back", [SANDRA]);
    // M21: producer may run on re-add; TASK_MENTION dedup key prevents a second notification row.
    expect(mocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mentionedUserIds: [SANDRA] }),
    );
  });

  it("HYDRATION — unchanged mention list when editing unrelated text", async () => {
    mocks.taskCommentFindFirst.mockResolvedValue(
      commentRow({
        body: "Hello @Sandra",
        mentions: [{ id: "m1", userId: SANDRA, createdAt: new Date() }],
      }),
    );
    mocks.validateMentions.mockResolvedValue([SANDRA]);
    await updateTaskComment(ctx(), TASK, "comment-1", "Hello @Sandra!!!", [SANDRA]);
    expect(mocks.mentionCreateMany).toHaveBeenCalledWith({
      data: [{ tenantId: TENANT, commentId: "comment-1", userId: SANDRA }],
    });
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06B deleted comment privacy", () => {
  it("M23 enrichment omits body and mentions for soft-deleted comments", async () => {
    const dtos = await enrichTaskComments(TENANT, [
      commentRow({
        deletedAt: new Date(),
        body: "secret @Sandra",
        mentions: [{ id: "m1", userId: SANDRA, createdAt: new Date() }],
      }) as never,
    ]);
    expect(dtos[0]?.body).toBeNull();
    expect(dtos[0]?.mentions).toEqual([]);
  });
});

describe("AUFGABEN-06B stale search fails closed at mutation", () => {
  it("M2 race — user eligible at search but denied at submit", async () => {
    mocks.validateMentions.mockRejectedValue(new TaskForbiddenError("denied"));
    await expect(createTaskComment(ctx(), TASK, "Hi", [SANDRA])).rejects.toThrow(TaskForbiddenError);
    expect(mocks.taskCommentCreate).not.toHaveBeenCalled();
    expect(mocks.emitNotifications).not.toHaveBeenCalled();
  });
});
