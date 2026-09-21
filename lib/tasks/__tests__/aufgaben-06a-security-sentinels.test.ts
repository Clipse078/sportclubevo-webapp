/**
 * AUFGABEN-06A — collaboration security sentinels (C1–C16).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { TaskForbiddenError, TaskNotFoundError } from "../errors";
import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
} from "../task-comment-service";
import { loadTaskTimelinePage } from "../task-timeline-service";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskCommentFindFirst: vi.fn(),
  taskCommentFindMany: vi.fn(),
  taskCommentCreate: vi.fn(),
  taskCommentUpdate: vi.fn(),
  auditFindMany: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  mentionDeleteMany: vi.fn(),
  mentionCreateMany: vi.fn(),
  transaction: vi.fn(),
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
    taskCommentMention: {
      deleteMany: mocks.mentionDeleteMany,
      createMany: mocks.mentionCreateMany,
    },
    auditLog: { findMany: mocks.auditFindMany },
    user: { findMany: mocks.userFindMany, findFirst: mocks.userFindFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../task-mention-auth", () => ({
  validateMentionedUsersForTask: vi.fn(async (_ctx, _task, ids: string[]) => ids),
}));

vi.mock("../task-mention-producer", () => ({
  emitTaskMentionNotifications: vi.fn(async () => undefined),
}));

vi.mock("../task-comment-producer", () => ({
  emitTaskCommentNotifications: vi.fn(async () => undefined),
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TASK = "task-confidential";
const ASSIGNEE = "user-assignee";
const MANAGER = "user-manager";
const VIEW_ALL = "user-view-all";
const ORG_FINANCE = "org-finance";

function serviceCtx(
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
  userId = ASSIGNEE,
  tenantId = TENANT_A,
) {
  return {
    tenantId,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT_A,
    createdByUserId: MANAGER,
    assigneeUserIds: [ASSIGNEE],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    ...overrides,
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT_A,
    title: "Confidential",
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
    orgUnitId: ORG_FINANCE,
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: MANAGER,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [
      {
        userId: ASSIGNEE,
        assignedAt: new Date(),
        user: { id: ASSIGNEE, firstName: "A", lastName: "Assignee" },
      },
    ],
    orgUnit: { tenantId: TENANT_A },
    ...overrides,
  };
}

function commentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "comment-foreign",
    tenantId: TENANT_A,
    taskId: TASK,
    authorUserId: ASSIGNEE,
    body: "Secret body",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    mentions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userFindFirst.mockResolvedValue({
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    person: null,
  });
  mocks.userFindMany.mockResolvedValue([]);
  mocks.auditFindMany.mockResolvedValue([]);
  mocks.taskCommentFindMany.mockResolvedValue([]);
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
  mocks.taskCommentCreate.mockImplementation(async () => commentRow());
});

describe("AUFGABEN-06A security sentinels", () => {
  it("C1 foreign tenant Task comments inaccessible", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(
      listTaskComments(serviceCtx([PERMISSIONS.TASKS_VIEW], {}, ASSIGNEE, TENANT_B), TASK),
    ).rejects.toThrow(TaskNotFoundError);
  });

  it("C2 foreign comment ID cannot be read through local Task", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentFindMany.mockResolvedValue([]);
    await listTaskComments(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK);
    expect(mocks.taskCommentFindMany.mock.calls[0]?.[0].where.taskId).toBe(TASK);
  });

  it("C3 foreign comment ID cannot be edited", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ taskId: "other-task" }));
    await expect(
      updateTaskComment(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK, "comment-foreign", "x"),
    ).rejects.toThrow(TaskNotFoundError);
  });

  it("C4 foreign comment ID cannot be deleted", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ taskId: "other-task" }));
    await expect(
      deleteTaskComment(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK, "comment-foreign"),
    ).rejects.toThrow(TaskNotFoundError);
  });

  it("C5 ASSIGNEES_ONLY direct assignee can read/comment", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentCreate.mockResolvedValue(commentRow());
    await expect(
      createTaskComment(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK, "Hi"),
    ).resolves.toBeDefined();
  });

  it("C6 ASSIGNEES_ONLY tasks.view_all cannot read comments without canonical Task access", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ assignees: [], createdByUserId: MANAGER }));
    await expect(
      listTaskComments(serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL], {}, VIEW_ALL), TASK),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("C7 ASSIGNEES_ONLY tenant-wide tasks.manage cannot bypass confidentiality", async () => {
    const record = authRecord({ createdByUserId: MANAGER, assigneeUserIds: [ASSIGNEE] });
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {}, VIEW_ALL);
    expect(canReadTask(ctx, record)).toBe(false);
    mocks.taskFindFirst.mockResolvedValue(taskRow({ assignees: [ASSIGNEE], createdByUserId: MANAGER }));
    await expect(listTaskComments(ctx, TASK)).rejects.toThrow(TaskForbiddenError);
  });

  it("C8 ASSIGNEES_ONLY Super Admin cannot bypass canonical Task policy", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { isSuperAdmin: true }, "super-admin");
    expect(canReadTask(ctx, authRecord())).toBe(false);
  });

  it("C9 ORG_UNIT authorized member can read/comment", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_FINANCE] });
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.ORG_UNIT, assignees: [] }),
    );
    mocks.taskCommentCreate.mockResolvedValue(commentRow());
    await expect(createTaskComment(ctx, TASK, "Org comment")).resolves.toBeDefined();
  });

  it("C10 ORG_UNIT unrelated manager cannot read comments", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: ["org-other"] });
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.ORG_UNIT, assignees: [] }),
    );
    await expect(listTaskComments(ctx, TASK)).rejects.toThrow(TaskForbiddenError);
  });

  it("C11 CLUB authorized broad reader can read/comment", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL], {}, VIEW_ALL);
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null }),
    );
    mocks.taskCommentFindMany.mockResolvedValue([]);
    await expect(listTaskComments(ctx, TASK)).resolves.toEqual([]);
  });

  it("C12 visibility change immediately changes comment access", () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL], {}, VIEW_ALL);
    const before = authRecord({
      visibilityScope: TaskVisibilityScope.CLUB,
      orgUnitId: null,
      assigneeUserIds: [],
    });
    const after = authRecord({ assigneeUserIds: [] });
    expect(canReadTask(ctx, before)).toBe(true);
    expect(canReadTask(ctx, after)).toBe(false);
  });

  it("C13 OrgUnit membership removal immediately revokes comment access", () => {
    const ctxBefore = serviceCtx([PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_FINANCE] });
    const ctxAfter = serviceCtx([PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [] });
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
      assigneeUserIds: [],
      createdByUserId: MANAGER,
    });
    expect(canReadTask(ctxBefore, record)).toBe(true);
    expect(canReadTask(ctxAfter, record)).toBe(false);
  });

  it("C14 comment author cannot edit after losing Task read access", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ assignees: [], createdByUserId: MANAGER }));
    await expect(
      updateTaskComment(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK, "comment-foreign", "x"),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("C15 soft-deleted body is never returned", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentFindMany.mockResolvedValue([
      commentRow({ deletedAt: new Date(), body: "Secret body" }),
    ]);
    const list = await listTaskComments(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK);
    expect(list[0]?.body).toBeNull();
    expect(JSON.stringify(list)).not.toContain("Secret body");
  });

  it("C16 crafted taskId/commentId pairing fails closed", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ taskId: "wrong-task" }));
    await expect(
      deleteTaskComment(serviceCtx([PERMISSIONS.TASKS_VIEW]), TASK, "comment-foreign"),
    ).rejects.toThrow(TaskNotFoundError);
  });

  it("C17 manager can moderate delete on manageable CLUB task", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {}, MANAGER);
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ visibilityScope: TaskVisibilityScope.CLUB, orgUnitId: null, assignees: [] }),
    );
    mocks.taskCommentFindFirst.mockResolvedValue(commentRow({ authorUserId: ASSIGNEE }));
    mocks.taskCommentUpdate.mockResolvedValue(commentRow({ deletedAt: new Date(), authorUserId: ASSIGNEE }));
    const dto = await deleteTaskComment(ctx, TASK, "comment-foreign");
    expect(dto.isDeleted).toBe(true);
  });

  it("timeline respects task visibility", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ assignees: [], createdByUserId: MANAGER }));
    await expect(
      loadTaskTimelinePage(serviceCtx([PERMISSIONS.TASKS_VIEW_ALL], {}, VIEW_ALL), TASK),
    ).rejects.toThrow(TaskForbiddenError);
  });
});
