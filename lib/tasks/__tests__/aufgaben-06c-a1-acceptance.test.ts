/**
 * AUFGABEN-06C-A1 — explicit F1–F40 acceptance + adversarial hardening.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { TaskForbiddenError, TaskNotFoundError } from "../errors";

const producerMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  loadPrefs: vi.fn(),
  createNotification: vi.fn(),
  filterReadable: vi.fn(),
  listFollowers: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $transaction: producerMocks.transaction },
}));

vi.mock("../task-mention-auth", () => ({
  filterUserIdsWhoCanReadTask: producerMocks.filterReadable,
}));

vi.mock("../task-follow-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../task-follow-service")>();
  return {
    ...actual,
    listTaskFollowerUserIds: producerMocks.listFollowers,
  };
});

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: producerMocks.loadPrefs,
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: producerMocks.createNotification,
}));

import {
  emitTaskCommentNotifications,
  emitTaskCommentNotificationsInTx,
} from "../task-comment-producer";

const followMocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  taskAssigneeCreate: vi.fn(),
  taskAssigneeDeleteMany: vi.fn(),
  taskFollowerUpsert: vi.fn(),
  taskFollowerDeleteMany: vi.fn(),
  taskFollowerCount: vi.fn(),
  taskFollowerFindFirst: vi.fn(),
  tenantMembershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: producerMocks.transaction,
    task: {
      findFirst: followMocks.taskFindFirst,
      update: followMocks.taskUpdate,
    },
    taskAssignee: {
      create: followMocks.taskAssigneeCreate,
      deleteMany: followMocks.taskAssigneeDeleteMany,
    },
    taskFollower: {
      upsert: followMocks.taskFollowerUpsert,
      deleteMany: followMocks.taskFollowerDeleteMany,
      count: followMocks.taskFollowerCount,
      findFirst: followMocks.taskFollowerFindFirst,
    },
    tenantMembership: { findFirst: followMocks.tenantMembershipFindFirst },
  },
}));

import { followTask, unfollowTask, getTaskFollowState } from "../task-follow-service";
import { requireVisibleTask } from "../task-access";

const TENANT = "tenant-a";
const TASK = "task-parent";
const SUBTASK = "task-sub";
const OCCURRENCE_A = "task-occ-a";
const OCCURRENCE_B = "task-occ-b";
const AUTHOR = "author-a";
const FOLLOWER_B = "follower-b";
const FOLLOWER_C = "follower-c";
const FOLLOWER_D = "follower-d";
const MENTION_E = "mention-e";
const NON_FOLLOWER_F = "non-follower-f";
const SANDRA = "sandra";
const MICHAEL = "michael";

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT,
    createdByUserId: AUTHOR,
    assigneeUserIds: [AUTHOR],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    ...overrides,
  };
}

function serviceCtx(
  userId: string,
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Turnierorganisation vorbereiten",
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: AUTHOR,
    orgUnitId: "org-original",
    orgUnit: null,
    assignees: [
      {
        userId: AUTHOR,
        assignedAt: new Date("2026-09-01T10:00:00.000Z"),
        user: { id: AUTHOR, firstName: "Michael", lastName: "M" },
      },
    ],
    ...overrides,
  };
}

const emitTaskRow = {
  id: TASK,
  tenantId: TENANT,
  title: "Turnierorganisation vorbereiten",
  visibilityScope: "ASSIGNEES_ONLY" as const,
  createdByUserId: AUTHOR,
  orgUnitId: null,
  orgUnit: null,
  assignees: [],
};

describe("AUFGABEN-06C-A1 comment producer matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    producerMocks.listFollowers.mockResolvedValue([
      FOLLOWER_B,
      FOLLOWER_C,
      FOLLOWER_D,
      NON_FOLLOWER_F,
    ]);
    producerMocks.filterReadable.mockImplementation(
      async (_tenantId: string, _task: unknown, userIds: string[]) =>
        userIds.filter((id) => id !== NON_FOLLOWER_F),
    );
    producerMocks.loadPrefs.mockImplementation(async (_tx, _tenant, userIds: string[]) => {
      return new Map(userIds.map((id) => [id, { inAppEnabled: true, emailEnabled: true }]));
    });
    producerMocks.transaction.mockImplementation(async (fn: (tx: object) => Promise<void>) => fn({}));
    producerMocks.createNotification.mockResolvedValue({ kind: "CREATED", notificationId: "n1" });
  });

  it("F20/F21/F23 — three followers, author and non-follower excluded", async () => {
    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-1",
      commentExcerpt: "Update",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });

    const types = mocksRecipientTypes();
    expect(types.get(AUTHOR)).toBeUndefined();
    expect(types.get(NON_FOLLOWER_F)).toBeUndefined();
    expect(types.get(FOLLOWER_B)).toBe(NotificationType.TASK_COMMENT);
    expect(types.get(FOLLOWER_C)).toBe(NotificationType.TASK_COMMENT);
    expect(types.get(FOLLOWER_D)).toBe(NotificationType.TASK_COMMENT);
    expect(producerMocks.createNotification).toHaveBeenCalledTimes(3);
  });

  it("F22 — mention precedence: C/E TASK_MENTION path excluded from TASK_COMMENT", async () => {
    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-2",
      commentExcerpt: "Ping",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [FOLLOWER_C, MENTION_E],
    });

    const recipients = producerMocks.createNotification.mock.calls.map(
      (call) => call[1].recipientUserId as string,
    );
    expect(recipients.sort()).toEqual([FOLLOWER_B, FOLLOWER_D].sort());
    expect(recipients).not.toContain(FOLLOWER_C);
  });

  it("F40 — follower list resolved before fresh authorization filter", async () => {
    const order: string[] = [];
    producerMocks.listFollowers.mockImplementation(async () => {
      order.push("listFollowers");
      return [FOLLOWER_B];
    });
    producerMocks.filterReadable.mockImplementation(async () => {
      order.push("filterReadable");
      return [FOLLOWER_B];
    });

    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-3",
      commentExcerpt: "Hi",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });

    expect(order).toEqual(["listFollowers", "filterReadable"]);
  });

  it("F33 — subtask comment resolves followers for subtask id only", async () => {
    producerMocks.listFollowers.mockResolvedValue([FOLLOWER_B]);
    await emitTaskCommentNotifications(
      { ...emitTaskRow, id: SUBTASK } as never,
      {
        commentId: "comment-sub",
        commentExcerpt: "Sub",
        actorUserId: AUTHOR,
        actorDisplayName: "Michael",
        excludeRecipientUserIds: [],
      },
    );
    expect(producerMocks.listFollowers).toHaveBeenCalledWith(TENANT, SUBTASK);
    expect(producerMocks.listFollowers).not.toHaveBeenCalledWith(TENANT, TASK);
  });

  it("F33 — parent comment resolves followers for parent id only", async () => {
    producerMocks.listFollowers.mockResolvedValue([FOLLOWER_D]);
    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-parent",
      commentExcerpt: "Parent",
      actorUserId: AUTHOR,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });
    expect(producerMocks.listFollowers).toHaveBeenCalledWith(TENANT, TASK);
    expect(producerMocks.listFollowers).not.toHaveBeenCalledWith(TENANT, SUBTASK);
  });

  it("F34 — recurrence occurrences isolated by concrete taskId", async () => {
    producerMocks.listFollowers.mockResolvedValue([SANDRA]);
    await emitTaskCommentNotifications(
      { ...emitTaskRow, id: OCCURRENCE_B } as never,
      {
        commentId: "comment-occ-b",
        commentExcerpt: "Occ B",
        actorUserId: MICHAEL,
        actorDisplayName: "Michael",
        excludeRecipientUserIds: [],
      },
    );
    expect(producerMocks.listFollowers).toHaveBeenCalledWith(TENANT, OCCURRENCE_B);
    expect(producerMocks.listFollowers).not.toHaveBeenCalledWith(TENANT, OCCURRENCE_A);
  });

  it("F30/F31 — TASK_COMMENT preference matrix (four combinations)", async () => {
    const combos = [
      { inAppEnabled: true, emailEnabled: true },
      { inAppEnabled: true, emailEnabled: false },
      { inAppEnabled: false, emailEnabled: true },
      { inAppEnabled: false, emailEnabled: false },
    ] as const;

    for (const pref of combos) {
      producerMocks.createNotification.mockClear();
      producerMocks.loadPrefs.mockResolvedValue(new Map([[FOLLOWER_B, pref]]));
      await emitTaskCommentNotificationsInTx(
        {} as never,
        {
          tenantId: TENANT,
          taskId: TASK,
          taskTitle: "T",
          commentId: `comment-pref-${String(pref.inAppEnabled)}-${String(pref.emailEnabled)}`,
          commentExcerpt: "Hi",
          actorUserId: AUTHOR,
          actorDisplayName: "Michael",
          excludeRecipientUserIds: [],
        },
        [FOLLOWER_B],
      );
      expect(producerMocks.createNotification.mock.calls[0]?.[1].preferences).toEqual(pref);
    }
  });
});

function mocksRecipientTypes(): Map<string, NotificationType> {
  const map = new Map<string, NotificationType>();
  for (const call of producerMocks.createNotification.mock.calls) {
    map.set(call[1].recipientUserId as string, call[1].type as NotificationType);
  }
  return map;
}

describe("AUFGABEN-06C-A1 follow mutation + access proofs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    followMocks.taskFindFirst.mockImplementation(async () => structuredClone(taskRow()));
    followMocks.tenantMembershipFindFirst.mockResolvedValue({ userId: SANDRA });
    followMocks.taskFollowerUpsert.mockResolvedValue({ id: "follow-1" });
    followMocks.taskFollowerDeleteMany.mockResolvedValue({ count: 1 });
    followMocks.taskFollowerCount.mockResolvedValue(1);
    followMocks.taskFollowerFindFirst.mockResolvedValue({ id: "follow-1" });
  });

  it("F13/F14/F15 — follow does not mutate assignees, visibilityScope, or orgUnitId", async () => {
    const before = taskRow();
    followMocks.taskFindFirst.mockResolvedValue(before);
    followMocks.tenantMembershipFindFirst.mockResolvedValue({ userId: AUTHOR });

    await followTask(serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]), TASK);

    expect(before.assignees).toHaveLength(1);
    expect(before.assignees[0]?.userId).toBe(AUTHOR);
    expect(before.visibilityScope).toBe(TaskVisibilityScope.ASSIGNEES_ONLY);
    expect(before.orgUnitId).toBe("org-original");
    expect(followMocks.taskUpdate).not.toHaveBeenCalled();
    expect(followMocks.taskAssigneeCreate).not.toHaveBeenCalled();
    expect(followMocks.taskAssigneeDeleteMany).not.toHaveBeenCalled();
    expect(followMocks.taskFollowerUpsert).toHaveBeenCalledTimes(1);
  });

  it("F17 — repeated follow uses stable upsert identity (one logical follower)", async () => {
    followMocks.tenantMembershipFindFirst.mockResolvedValue({ userId: AUTHOR });
    await followTask(serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]), TASK);
    await followTask(serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]), TASK);
    expect(followMocks.taskFollowerUpsert).toHaveBeenCalledTimes(2);
    for (const call of followMocks.taskFollowerUpsert.mock.calls) {
      expect(call[0].where).toEqual({ taskId_userId: { taskId: TASK, userId: AUTHOR } });
    }
  });

  it("F18 — repeated unfollow deleteMany idempotent", async () => {
    followMocks.taskFindFirst.mockResolvedValue(
      taskRow({
        assignees: [
          {
            userId: SANDRA,
            assignedAt: new Date(),
            user: { id: SANDRA, firstName: "S", lastName: "S" },
          },
        ],
      }),
    );
    await unfollowTask(serviceCtx(SANDRA, [PERMISSIONS.TASKS_VIEW]), TASK);
    await unfollowTask(serviceCtx(SANDRA, [PERMISSIONS.TASKS_VIEW]), TASK);
    expect(followMocks.taskFollowerDeleteMany).toHaveBeenCalledTimes(2);
    expect(followMocks.taskFollowerDeleteMany.mock.calls[0]?.[0].where).toEqual({
      tenantId: TENANT,
      taskId: TASK,
      userId: SANDRA,
    });
  });

  it("F38 — unreadable caller cannot read follower count or isFollowing", async () => {
    followMocks.taskFindFirst.mockResolvedValue(taskRow());
    await expect(
      getTaskFollowState(serviceCtx("outsider", [PERMISSIONS.TASKS_VIEW]), TASK),
    ).rejects.toThrow(TaskForbiddenError);
    expect(followMocks.taskFollowerCount).not.toHaveBeenCalled();
    expect(followMocks.taskFollowerFindFirst).not.toHaveBeenCalled();
  });

  it("F2 — foreign tenant task fails closed on follow state", async () => {
    followMocks.taskFindFirst.mockResolvedValue(null);
    await expect(getTaskFollowState(serviceCtx(SANDRA, [PERMISSIONS.TASKS_VIEW]), TASK)).rejects.toThrow(
      TaskNotFoundError,
    );
  });

  it("F16/F39 — TaskFollower never grants canReadTask", () => {
    const outsider = serviceCtx("outsider-with-follower-row", [PERMISSIONS.TASKS_VIEW]);
    expect(canReadTask(outsider, authRecord())).toBe(false);
    expect(canReadTask(outsider, authRecord({ assigneeUserIds: ["outsider-with-follower-row"] }))).toBe(
      true,
    );
  });

  it("F25 — stale deep link path still requires canonical read at workspace gate", async () => {
    followMocks.taskFindFirst.mockResolvedValue(taskRow());
    await expect(
      requireVisibleTask(serviceCtx("outsider", [PERMISSIONS.TASKS_VIEW]), TASK),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("F24/F9 access-loss race — follower filtered, zero TASK_COMMENT", async () => {
    producerMocks.listFollowers.mockResolvedValue([SANDRA]);
    producerMocks.filterReadable.mockResolvedValue([]);
    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-race",
      commentExcerpt: "After access loss",
      actorUserId: MICHAEL,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });
    expect(producerMocks.createNotification).not.toHaveBeenCalled();
  });

  it("F21 unfollow-before-comment — empty follower list yields no TASK_COMMENT", async () => {
    producerMocks.listFollowers.mockResolvedValue([]);
    await emitTaskCommentNotifications(emitTaskRow as never, {
      commentId: "comment-unfollow",
      commentExcerpt: "Too late",
      actorUserId: MICHAEL,
      actorDisplayName: "Michael",
      excludeRecipientUserIds: [],
    });
    expect(producerMocks.createNotification).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06C-A1 static regression guards", () => {
  const authPaths = [
    "lib/tasks/task-authorization.ts",
    "lib/tasks/task-access.ts",
    "lib/tasks/visibility.ts",
  ];

  it("F39 — canonical read paths never reference TaskFollower", () => {
    for (const rel of authPaths) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      expect(source).not.toMatch(/TaskFollower|taskFollower|listTaskFollowerUserIds/);
    }
    const seriesSource = readFileSync(join(process.cwd(), "lib/tasks/task-authorization.ts"), "utf8");
    expect(seriesSource).toContain("buildTaskSeriesReadWhere");
    expect(seriesSource).not.toMatch(/follower/i);
  });

  it("F37 — follower queries tenant + task scoped", () => {
    const source = readFileSync(join(process.cwd(), "lib/tasks/task-follow-service.ts"), "utf8");
    expect(source).toMatch(/where:\s*\{\s*tenantId,\s*taskId\s*\}/);
    expect(source).toMatch(/listTaskFollowerUserIds[\s\S]*findMany[\s\S]*tenantId,\s*taskId/);
  });

  it("F21 performance — batched auth filter, no per-follower canReadTask loop in producer", () => {
    const producer = readFileSync(join(process.cwd(), "lib/tasks/task-comment-producer.ts"), "utf8");
    expect(producer).toContain("filterUserIdsWhoCanReadTask");
    expect(producer).not.toMatch(/for\s*\([^)]*follower[^)]*\)[\s\S]*canReadTask/);
    expect(producer).not.toMatch(/25|RECIPIENT_CAP|slice\s*\(\s*0\s*,\s*25\s*\)/);
  });

  it("F35 — Participation modules unchanged by TaskFollower", () => {
    const paths = [
      "lib/participation/participation-service.ts",
      "lib/personal-actions/load-personal-actions.ts",
      "lib/personal-actions/sources/attendance-source.ts",
    ];
    for (const rel of paths) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      expect(source).not.toMatch(/TaskFollower|taskFollower|followTask/);
    }
  });

  it("F36 — Matrix Z additive: multi-hat user with canonical read may follow", () => {
    const matrixUser = serviceCtx("matrix-z-user", [PERMISSIONS.TASKS_VIEW], {
      memberOrgUnitIds: ["org-board"],
      permissionReadOrgUnitIds: ["org-board"],
      permissionManageOrgUnitIds: [],
    });
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: "org-board",
      assigneeUserIds: [],
    });
    expect(canReadTask(matrixUser, record)).toBe(true);
  });

  it("F24 — no public follower identity list API in follow service", () => {
    const source = readFileSync(join(process.cwd(), "lib/tasks/task-follow-service.ts"), "utf8");
    expect(source).not.toMatch(/findMany[\s\S]*select:[\s\S]*firstName/);
    expect(source).toContain("listTaskFollowerUserIds");
    expect(source).toMatch(/select:\s*\{\s*userId:\s*true\s*\}/);
  });

  it("F24 default subscription — no auto TaskFollower on create/assign/comment paths", () => {
    const paths = [
      "lib/tasks/task-comment-service.ts",
      "lib/tasks/management-service.ts",
      "lib/tasks/task-series-service.ts",
    ];
    for (const rel of paths) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      expect(source).not.toMatch(/taskFollower\.(create|upsert)|followTask\(/);
    }
    const actions = readFileSync(join(process.cwd(), "app/(admin)/dashboard/aufgaben/actions.ts"), "utf8");
    expect(actions).toMatch(/followTaskAction/);
    expect(actions).not.toMatch(/taskFollower\.(create|upsert)/);
  });
});
