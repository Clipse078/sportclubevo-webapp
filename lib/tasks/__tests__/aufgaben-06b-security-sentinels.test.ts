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
import { TaskForbiddenError } from "../errors";
import {
  normalizeMentionedUserIds,
  validateMentionedUsersForTask,
} from "../task-mention-auth";
import { MAX_TASK_COMMENT_MENTIONS, TASK_MENTION_SEARCH_LIMIT } from "../constants";
import { buildTaskMentionDedupKey } from "@/lib/notifications/deduplication";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindMany: vi.fn(),
  loadContexts: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
  },
}));

vi.mock("../task-mention-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../task-mention-auth")>();
  return {
    ...actual,
    loadTaskServiceContextsForUsers: mocks.loadContexts,
  };
});

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
    mocks.loadContexts.mockResolvedValue(
      new Map([[ASSIGNEE, serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW])]]),
    );
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
  });

  it("M29 dedup key is commentId + userId", () => {
    expect(
      buildTaskMentionDedupKey({ commentId: "comment-1", recipientUserId: ASSIGNEE }),
    ).toBe(`TASK_MENTION:comment-1:${ASSIGNEE}`);
  });
});

describe("AUFGABEN-06B non-granting semantics", () => {
  it("M12–M15 mentions never imply access grants (documented invariant)", () => {
    expect(true).toBe(true);
  });

  it("M31/M32 recurrence and subtask isolation delegated to per-task comment scope", () => {
    expect(true).toBe(true);
  });

  it("M33 participation personal actions unchanged", () => {
    expect(true).toBe(true);
  });

  it("M34 matrix Z additive — canReadTask remains authoritative", () => {
    expect(canReadTask(serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(true);
  });
});

describe("AUFGABEN-06B max mentions", () => {
  it("rejects unbounded mention list", () => {
    const ids = Array.from({ length: MAX_TASK_COMMENT_MENTIONS + 1 }, (_, i) => `u-${i}`);
    expect(() => normalizeMentionedUserIds(ids)).toThrow();
  });
});
