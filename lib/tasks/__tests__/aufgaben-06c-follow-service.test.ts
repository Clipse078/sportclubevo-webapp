/**
 * AUFGABEN-06C — follow service behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFollowerUpsert: vi.fn(),
  taskFollowerDeleteMany: vi.fn(),
  taskFollowerCount: vi.fn(),
  taskFollowerFindFirst: vi.fn(),
  tenantMembershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    taskFollower: {
      upsert: mocks.taskFollowerUpsert,
      deleteMany: mocks.taskFollowerDeleteMany,
      count: mocks.taskFollowerCount,
      findFirst: mocks.taskFollowerFindFirst,
    },
    tenantMembership: { findFirst: mocks.tenantMembershipFindFirst },
  },
}));

import {
  followTask,
  unfollowTask,
  getTaskFollowState,
  canFollowTask,
} from "../task-follow-service";
import { canReadTask, type TaskAuthorizationRecord } from "../task-authorization";

const TENANT = "tenant-a";
const TASK = "task-1";
const USER = "user-follower";

function taskRow() {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Turnierorganisation vorbereiten",
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: "creator",
    orgUnitId: null,
    orgUnit: null,
    assignees: [{ userId: USER, assignedAt: new Date(), user: { id: USER, firstName: "S", lastName: "S" } }],
  };
}

function ctx(userId = USER) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT,
    createdByUserId: "creator",
    assigneeUserIds: [USER],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    ...overrides,
  };
}

describe("AUFGABEN-06C follow service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.tenantMembershipFindFirst.mockResolvedValue({ userId: USER });
    mocks.taskFollowerCount.mockResolvedValue(1);
    mocks.taskFollowerFindFirst.mockResolvedValue({ id: "follow-1" });
    mocks.taskFollowerUpsert.mockResolvedValue({ id: "follow-1" });
    mocks.taskFollowerDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("F1/F8/F9 — readable assignee may follow", async () => {
    expect(canFollowTask(ctx(), authRecord())).toBe(true);
    await followTask(ctx(), TASK);
    expect(mocks.taskFollowerUpsert).toHaveBeenCalledTimes(1);
  });

  it("F17 — repeated follow upserts idempotently", async () => {
    await followTask(ctx(), TASK);
    await followTask(ctx(), TASK);
    expect(mocks.taskFollowerUpsert).toHaveBeenCalledTimes(2);
  });

  it("F18 — repeated unfollow is idempotent", async () => {
    await unfollowTask(ctx(), TASK);
    await unfollowTask(ctx(), TASK);
    expect(mocks.taskFollowerDeleteMany).toHaveBeenCalledTimes(2);
  });

  it("F3 — unreadable task denied at follow", async () => {
    await expect(
      followTask(
        {
          tenantId: TENANT,
          userId: "outsider",
          permissionKeys: [PERMISSIONS.TASKS_VIEW],
          auth: { ...EMPTY_TASK_AUTH_SCOPE },
        },
        TASK,
      ),
    ).rejects.toThrow(TaskForbiddenError);
    expect(mocks.taskFollowerUpsert).not.toHaveBeenCalled();
  });

  it("F2 — foreign tenant task surfaces as not found/forbidden", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(followTask(ctx(), TASK)).rejects.toThrow();
    expect(mocks.taskFollowerUpsert).not.toHaveBeenCalled();
  });

  it("requires active tenant membership", async () => {
    mocks.tenantMembershipFindFirst.mockResolvedValue(null);
    await expect(followTask(ctx(), TASK)).rejects.toThrow(TaskValidationError);
  });

  it("returns own follow state and count without listing identities", async () => {
    mocks.taskFollowerCount.mockResolvedValue(3);
    mocks.taskFollowerFindFirst.mockResolvedValue(null);
    const state = await getTaskFollowState(ctx(), TASK);
    expect(state).toEqual({ isFollowing: false, followerCount: 3 });
  });

  it("F16 — canFollowTask equals canReadTask only", () => {
    expect(canFollowTask(ctx(), authRecord())).toBe(canReadTask(ctx(), authRecord()));
    expect(canFollowTask(ctx("outsider"), authRecord())).toBe(
      canReadTask(ctx("outsider"), authRecord()),
    );
  });
});
