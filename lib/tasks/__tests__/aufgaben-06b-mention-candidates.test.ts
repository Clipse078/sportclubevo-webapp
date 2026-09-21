/**
 * AUFGABEN-06B — mention candidate search (M25–M28, identity leakage, bounds).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import {
  TASK_MENTION_SEARCH_LIMIT,
  TASK_MENTION_SEARCH_MAX_DB_ROWS,
} from "../constants";
import {
  searchTaskMentionCandidates,
  taskMentionSearchWorstCaseDbRowBound,
  userCanBeMentionCandidate,
} from "../task-mention-candidates";

const mocks = vi.hoisted(() => ({
  tenantMembershipFindMany: vi.fn(),
  filterReadable: vi.fn(),
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
    filterUserIdsWhoCanReadTask: mocks.filterReadable,
  };
});

const TENANT = "tenant-a";
const TASK = "task-1";
const AUTHOR = "user-author";
const ASSIGNEE = "user-assignee";
const OUTSIDER = "user-outsider";
const FOREIGN = "user-foreign";

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Task",
    visibilityScope: TaskVisibilityScope.CLUB,
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

function ctx(userId = AUTHOR) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

function membershipUser(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
) {
  return {
    user: { id: userId, firstName, lastName, email, isActive: true },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.filterReadable.mockImplementation(async (_tenantId, _task, ids: string[]) => ids);
});

describe("AUFGABEN-06B mention candidate search", () => {
  it("M25/M28 requires tenant-scoped membership query and caller-visible task", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      membershipUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
    ]);

    await searchTaskMentionCandidates(ctx(), taskRow(), "sa");

    expect(mocks.tenantMembershipFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT, isActive: true }),
      }),
    );
  });

  it("M26 post-filters to users who canReadTask", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      membershipUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
      membershipUser(OUTSIDER, "Otto", "Out", "otto@example.com"),
    ]);
    mocks.filterReadable.mockResolvedValue([ASSIGNEE]);

    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "sa");

    expect(options.map((o) => o.userId)).toEqual([ASSIGNEE]);
    expect(mocks.filterReadable).toHaveBeenCalledWith(
      TENANT,
      expect.any(Object),
      expect.arrayContaining([ASSIGNEE, OUTSIDER]),
    );
  });

  it("M27/M28 identity leakage — ineligible users never returned", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      membershipUser(OUTSIDER, "Leo", "Leak", "leak@example.com"),
      membershipUser(FOREIGN, "F", "Foreign", "f@other.com"),
    ]);
    mocks.filterReadable.mockResolvedValue([]);

    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "le");

    expect(options).toEqual([]);
  });

  it("ASSIGNEES_ONLY searches only direct participants (bounded)", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      membershipUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
    ]);

    const options = await searchTaskMentionCandidates(
      ctx(),
      taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
      "sa",
    );

    expect(options).toHaveLength(1);
    const call = mocks.tenantMembershipFindMany.mock.calls[0]?.[0];
    expect(call.where.userId).toEqual({ in: expect.arrayContaining([AUTHOR, ASSIGNEE]) });
    expect(call.take).toBeLessThanOrEqual(TASK_MENTION_SEARCH_LIMIT);
  });

  it("CLUB search uses bounded over-fetch with strict DB row cap", async () => {
    const batch = Math.max(TASK_MENTION_SEARCH_LIMIT * 3, TASK_MENTION_SEARCH_LIMIT);
    mocks.tenantMembershipFindMany
      .mockResolvedValueOnce(
        Array.from({ length: batch }, (_, i) =>
          membershipUser(`u-${i}`, "N", `User${i}`, `u${i}@example.com`),
        ),
      )
      .mockResolvedValueOnce([]);

    mocks.filterReadable.mockImplementation(async (_t, _task, ids: string[]) =>
      ids.filter((id) => id === "u-0"),
    );

    await searchTaskMentionCandidates(ctx(), taskRow(), "user");

    const totalTake = mocks.tenantMembershipFindMany.mock.calls.reduce(
      (sum, call) => sum + (call[0]?.take ?? 0),
      0,
    );
    expect(totalTake).toBeLessThanOrEqual(TASK_MENTION_SEARCH_MAX_DB_ROWS);
    expect(taskMentionSearchWorstCaseDbRowBound()).toBe(TASK_MENTION_SEARCH_MAX_DB_ROWS);
  });

  it("short query below min chars returns empty without DB scan", async () => {
    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "a");
    expect(options).toEqual([]);
    expect(mocks.tenantMembershipFindMany).not.toHaveBeenCalled();
  });

  it("excludes searching user from results", async () => {
    mocks.tenantMembershipFindMany.mockResolvedValue([
      membershipUser(AUTHOR, "Anna", "Author", "a@example.com"),
    ]);
    mocks.filterReadable.mockResolvedValue([AUTHOR]);

    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "an");
    expect(options).toEqual([]);
  });

  it("userCanBeMentionCandidate mirrors canReadTask", () => {
    const assigneeCtx = {
      tenantId: TENANT,
      userId: ASSIGNEE,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      auth: { ...EMPTY_TASK_AUTH_SCOPE },
    };
    expect(
      userCanBeMentionCandidate(
        assigneeCtx,
        taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
      ),
    ).toBe(true);
    expect(
      userCanBeMentionCandidate(
        {
          tenantId: TENANT,
          userId: OUTSIDER,
          permissionKeys: [PERMISSIONS.TASKS_VIEW],
          auth: { ...EMPTY_TASK_AUTH_SCOPE },
        },
        taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
      ),
    ).toBe(false);
  });
});
