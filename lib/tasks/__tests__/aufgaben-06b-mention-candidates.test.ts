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
  searchIdentities: vi.fn(),
  listIdentities: vi.fn(),
  filterReadable: vi.fn(),
}));

vi.mock("@/lib/people/person-user-identity", () => ({
  searchEligiblePersonUserIdentitiesInTenant: mocks.searchIdentities,
  listEligiblePersonUserIdentitiesInTenant: mocks.listIdentities,
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

function identityUser(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  personId = `person-${userId}`,
) {
  return {
    personId,
    userId,
    tenantId: TENANT,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    email,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.filterReadable.mockImplementation(async (_tenantId, _task, ids: string[]) => ids);
});

describe("AUFGABEN-06B mention candidate search", () => {
  it("M25/M28 requires tenant-scoped person identity search", async () => {
    mocks.searchIdentities.mockResolvedValue([
      identityUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
    ]);

    await searchTaskMentionCandidates(ctx(), taskRow(), "sa");

    expect(mocks.searchIdentities).toHaveBeenCalledWith(TENANT, "sa", expect.any(Number));
  });

  it("M26 post-filters to users who canReadTask", async () => {
    mocks.searchIdentities.mockResolvedValue([
      identityUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
      identityUser(OUTSIDER, "Otto", "Out", "otto@example.com"),
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
    mocks.searchIdentities.mockResolvedValue([
      identityUser(OUTSIDER, "Leo", "Leak", "leak@example.com"),
      identityUser(FOREIGN, "F", "Foreign", "f@other.com"),
    ]);
    mocks.filterReadable.mockResolvedValue([]);

    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "le");

    expect(options).toEqual([]);
  });

  it("ASSIGNEES_ONLY searches only direct participants (bounded)", async () => {
    mocks.searchIdentities.mockResolvedValue([
      identityUser(ASSIGNEE, "Sandra", "Schmid", "sandra@example.com"),
      identityUser(OUTSIDER, "Otto", "Out", "otto@example.com"),
    ]);

    const options = await searchTaskMentionCandidates(
      ctx(),
      taskRow({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
      "sa",
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.displayName).toBe("Sandra Schmid");
  });

  it("CLUB search forwards bounded limit to person identity search", async () => {
  mocks.searchIdentities.mockResolvedValue([
    identityUser("u-0", "N", "User0", "u0@example.com"),
  ]);

  mocks.filterReadable.mockImplementation(async (_t, _task, ids: string[]) =>
    ids.filter((id) => id === "u-0"),
  );

  await searchTaskMentionCandidates(ctx(), taskRow(), "user");

  expect(mocks.searchIdentities).toHaveBeenCalledWith(
    TENANT,
    "user",
    TASK_MENTION_SEARCH_MAX_DB_ROWS,
  );
  expect(taskMentionSearchWorstCaseDbRowBound()).toBe(TASK_MENTION_SEARCH_MAX_DB_ROWS);
});

  it("short query below min chars returns empty without DB scan", async () => {
    const options = await searchTaskMentionCandidates(ctx(), taskRow(), "a");
    expect(options).toEqual([]);
    expect(mocks.searchIdentities).not.toHaveBeenCalled();
  });

  it("excludes searching user from results", async () => {
    mocks.searchIdentities.mockResolvedValue([
      identityUser(AUTHOR, "Anna", "Author", "a@example.com"),
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
