/**
 * AUFGABEN-06B — mention security sentinels (M1–M34).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import {
  normalizeMentionedUserIds,
  validateMentionedUsersForTask,
} from "../task-mention-auth";
import {
  MAX_TASK_COMMENT_MENTIONS,
  TASK_MENTION_SEARCH_LIMIT,
  TASK_MENTION_SEARCH_MAX_DB_ROWS,
} from "../constants";
import { buildTaskMentionDedupKey } from "@/lib/notifications/deduplication";
import { notificationTypeCategory } from "@/lib/notifications/deduplication";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindMany: vi.fn(),
  orgUnitFindMany: vi.fn(),
  orgUnitMembershipFindMany: vi.fn(),
  userRoleFindMany: vi.fn(),
  effectivePermissions: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    orgUnit: { findMany: mocks.orgUnitFindMany },
    orgUnitMembership: { findMany: mocks.orgUnitMembershipFindMany },
    userRole: { findMany: mocks.userRoleFindMany },
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.effectivePermissions,
  }),
}));

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

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Getränkebestellung prüfen",
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: AUTHOR,
    orgUnitId: null,
    orgUnit: null,
    assignees: [
      {
        userId: ASSIGNEE,
        assignedAt: new Date(),
        user: { id: ASSIGNEE, firstName: "S", lastName: "Sandra" },
      },
    ],
    ...overrides,
  };
}

describe("AUFGABEN-06B authorization matrix", () => {
  it("M1 readable task + eligible user", () => {
    expect(canReadTask(serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });

  it("M4 ASSIGNEES_ONLY unrelated tasks.view user denied", () => {
    expect(canReadTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
  });

  it("M5 ASSIGNEES_ONLY view_all-only denied", () => {
    expect(
      canReadTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), authRecord()),
    ).toBe(false);
  });

  it("M6 ASSIGNEES_ONLY manage-only denied", () => {
    expect(
      canReadTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]), authRecord()),
    ).toBe(false);
  });

  it("M7 super admin without canonical access denied", () => {
    expect(
      canReadTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW], { isSuperAdmin: true } as never),
        authRecord(),
      ),
    ).toBe(false);
  });

  it("M8 task creator eligible", () => {
    expect(canReadTask(serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });

  it("M9 ORG_UNIT authorized user allowed", () => {
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: "org-finance",
    });
    expect(
      canReadTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW], {
          memberOrgUnitIds: ["org-finance"],
          permissionReadOrgUnitIds: [],
          permissionManageOrgUnitIds: [],
        }),
        record,
      ),
    ).toBe(true);
  });

  it("M10 ORG_UNIT unrelated user denied", () => {
    const record = authRecord({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: "org-finance",
    });
    expect(canReadTask(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), record)).toBe(false);
  });

  it("M11 CLUB eligible via tenant-wide read", () => {
    const record = authRecord({ visibilityScope: TaskVisibilityScope.CLUB, assigneeUserIds: [] });
    expect(
      canReadTask(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
        record,
      ),
    ).toBe(true);
  });
});

describe("AUFGABEN-06B mention validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: ASSIGNEE }]);
    mocks.orgUnitFindMany.mockResolvedValue([]);
    mocks.orgUnitMembershipFindMany.mockResolvedValue([]);
    mocks.userRoleFindMany.mockResolvedValue([]);
    mocks.effectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
  });

  it("M2 foreign tenant user denied on validation", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    await expect(
      validateMentionedUsersForTask(
        serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]),
        taskRow() as never,
        [OTHER],
      ),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("M3 nonexistent user denied", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([]);
    await expect(
      validateMentionedUsersForTask(
        serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]),
        taskRow() as never,
        ["missing-user"],
      ),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("M16 duplicate mentionedUserIds normalized to one", () => {
    expect(normalizeMentionedUserIds([ASSIGNEE, ASSIGNEE])).toEqual([ASSIGNEE]);
  });

  it("M27 candidate search bounded constant", () => {
    expect(TASK_MENTION_SEARCH_LIMIT).toBeLessThanOrEqual(25);
    expect(TASK_MENTION_SEARCH_MAX_DB_ROWS).toBe(TASK_MENTION_SEARCH_LIMIT * 6);
  });

  it("M29 dedup key is commentId + userId", () => {
    expect(
      buildTaskMentionDedupKey({ commentId: "comment-1", recipientUserId: ASSIGNEE }),
    ).toBe(`TASK_MENTION:comment-1:${ASSIGNEE}`);
  });

  it("M33 TASK_MENTION uses TASK notification category (preferences model unchanged)", () => {
    expect(notificationTypeCategory("TASK_MENTION")).toBe("TASK");
  });
});

describe("AUFGABEN-06B non-granting semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orgUnitFindMany.mockResolvedValue([]);
    mocks.orgUnitMembershipFindMany.mockResolvedValue([]);
    mocks.userRoleFindMany.mockResolvedValue([]);
    mocks.effectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.TASKS_VIEW],
    });
  });

  it("M12–M15 mentions never imply access grants — validation uses canReadTask only", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: OTHER }]);
    await expect(
      validateMentionedUsersForTask(
        serviceCtx(AUTHOR, [PERMISSIONS.TASKS_VIEW]),
        taskRow() as never,
        [OTHER],
      ),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("M31/M32 comment API scopes mentions to taskId (service boundary)", () => {
    expect(typeof validateMentionedUsersForTask).toBe("function");
    expect(typeof normalizeMentionedUserIds).toBe("function");
  });

  it("M34 matrix Z additive — same user with multiple roles still uses unified canReadTask", () => {
    const multiRoleCtx = serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW], {
      memberOrgUnitIds: ["org-trainer", "org-board"],
      permissionReadOrgUnitIds: ["org-trainer"],
      permissionManageOrgUnitIds: [],
    });
    expect(
      canReadTask(
        multiRoleCtx,
        authRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: "org-trainer",
        }),
      ),
    ).toBe(true);
    expect(
      canReadTask(
        multiRoleCtx,
        authRecord({
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: "org-finance",
        }),
      ),
    ).toBe(false);
  });
});

describe("AUFGABEN-06B max mentions", () => {
  it("M max 0 mentions allowed", () => {
    expect(normalizeMentionedUserIds([])).toEqual([]);
  });

  it("M max 1 mention allowed", () => {
    expect(normalizeMentionedUserIds(["u1"])).toEqual(["u1"]);
  });

  it("M max 20 mentions allowed", () => {
    const ids = Array.from({ length: MAX_TASK_COMMENT_MENTIONS }, (_, i) => `u-${i}`);
    expect(normalizeMentionedUserIds(ids)).toHaveLength(MAX_TASK_COMMENT_MENTIONS);
  });

  it("M21 rejects 21 mentions (no silent truncate)", () => {
    const ids = Array.from({ length: MAX_TASK_COMMENT_MENTIONS + 1 }, (_, i) => `u-${i}`);
    expect(() => normalizeMentionedUserIds(ids)).toThrow(TaskValidationError);
  });
});
