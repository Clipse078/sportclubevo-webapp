/**
 * AUFGABEN-06C — follower + comment notification security sentinels (F1–F40).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { canFollowTask } from "../task-follow-service";
import { buildTaskCommentDedupKey } from "@/lib/notifications/deduplication";
import { notificationTypeCategory } from "@/lib/notifications/deduplication";
import { NotificationType } from "@prisma/client";

const TENANT = "tenant-a";
const TASK = "task-1";
const AUTHOR = "user-author";
const ASSIGNEE = "user-assignee";
const OTHER = "user-other";

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT,
    createdByUserId: AUTHOR,
    assigneeUserIds: [ASSIGNEE],
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

describe("AUFGABEN-06C authorization matrix", () => {
  it("F1 readable task → follow allowed", () => {
    expect(canFollowTask(serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });

  it("F4 ASSIGNEES_ONLY unrelated tasks.view denied", () => {
    expect(canFollowTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
  });

  it("F5 ASSIGNEES_ONLY view_all-only denied", () => {
    expect(
      canFollowTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
        authRecord(),
      ),
    ).toBe(false);
  });

  it("F6 ASSIGNEES_ONLY manage-only denied", () => {
    expect(
      canFollowTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
        authRecord(),
      ),
    ).toBe(false);
  });

  it("F7 Super Admin without canonical confidential access denied", () => {
    expect(
      canFollowTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW], { isSuperAdmin: true } as never),
        authRecord(),
      ),
    ).toBe(false);
  });

  it("F8 creator with canonical read allowed", () => {
    expect(canFollowTask(serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });

  it("F9 direct assignee allowed", () => {
    expect(canFollowTask(serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });

  it("F10 ORG_UNIT authorized user allowed", () => {
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: "org-finance",
    });
    expect(
      canFollowTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW], {
          memberOrgUnitIds: ["org-finance"],
        }),
        record,
      ),
    ).toBe(true);
  });

  it("F11 ORG_UNIT unrelated user denied", () => {
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: "org-finance",
    });
    expect(canFollowTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), record)).toBe(false);
  });

  it("F12 CLUB authorized user allowed", () => {
    expect(
      canFollowTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
        authRecord({ visibilityScope: TaskVisibilityScope.CLUB }),
      ),
    ).toBe(true);
  });

  it("F16 follow does not grant Task access", () => {
    expect(canReadTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
    expect(canFollowTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
  });

  it("F39 TaskFollower is not consulted by canReadTask", () => {
    const source = readFileSync(join(process.cwd(), "lib/tasks/task-authorization.ts"), "utf8");
    expect(source).not.toMatch(/TaskFollower|taskFollower/);
  });

  it("F29 dedup identity", () => {
    expect(
      buildTaskCommentDedupKey({ commentId: "c1", recipientUserId: "u1" }),
    ).toBe("TASK_COMMENT:c1:u1");
  });

  it("TASK_COMMENT category TASK", () => {
    expect(notificationTypeCategory(NotificationType.TASK_COMMENT)).toBe("TASK");
  });
});

describe("AUFGABEN-06C workspace integration guards", () => {
  it("F39 follow UI embedded near activity without redesign", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/TaskWorkspace.tsx"),
      "utf8",
    );
    expect(source).toContain("TaskFollowControl");
    expect(source).toContain("TaskActivitySection");
  });

  it("F26/F27 comment edit/delete do not invoke comment producer on update path", () => {
    const source = readFileSync(join(process.cwd(), "lib/tasks/task-comment-service.ts"), "utf8");
    expect(source).toContain("emitTaskCommentNotifications");
    const updateBlock = source.split("export async function updateTaskComment")[1]?.split("export async function deleteTaskComment")[0];
    expect(updateBlock).not.toContain("emitTaskCommentNotifications");
    const deleteBlock = source.split("export async function deleteTaskComment")[1];
    expect(deleteBlock).not.toContain("emitTaskCommentNotifications");
  });

  it("F22 mention precedence excludes mentioned followers at comment create", () => {
    const source = readFileSync(join(process.cwd(), "lib/tasks/task-comment-service.ts"), "utf8");
    expect(source).toMatch(/excludeRecipientUserIds:\s*validatedMentions/);
  });
});
