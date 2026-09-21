/**
 * AUFGABEN-06E-A2 — R137 comment anchor resolves across timeline pages (runtime).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { TaskForbiddenError } from "../errors";
import {
  loadTaskTimelinePage,
  loadTaskTimelinePageForCommentAnchor,
} from "../task-timeline-service";
import { TASK_TIMELINE_ANCHOR_MAX_PAGES } from "../constants";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskCommentFindFirst: vi.fn(),
  auditFindMany: vi.fn(),
  taskCommentFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    taskComment: {
      findFirst: mocks.taskCommentFindFirst,
      findMany: mocks.taskCommentFindMany,
    },
    auditLog: { findMany: mocks.auditFindMany },
    user: { findMany: mocks.userFindMany },
  },
}));

const TENANT = "tenant-a";
const TASK = "task-1";
const USER = "user-1";
const OUTSIDER = "outsider-1";
const TARGET_COMMENT_ID = "comment-on-page-2";
const PAGE_SIZE = 2;

function ctx(userId: string) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys: [PERMISSIONS.TASKS_VIEW],
    auth: { ...EMPTY_TASK_AUTH_SCOPE, isSuperAdmin: false },
  };
}

function taskRow() {
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
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: "creator",
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    assignees: [
      {
        userId: USER,
        assignedAt: new Date(),
        user: { id: USER, firstName: "M", lastName: "Michael" },
      },
    ],
    orgUnit: null,
  };
}

function audit(id: string, createdAt: Date) {
  return {
    id,
    actorUserId: USER,
    action: "TASK_UPDATED",
    beforeJson: null,
    afterJson: null,
    createdAt,
  };
}

function comment(id: string, createdAt: Date) {
  return {
    id,
    tenantId: TENANT,
    taskId: TASK,
    authorUserId: USER,
    body: `body-${id}`,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    mentions: [],
  };
}

function matchesTimelineWhereClause(
  row: { createdAt: Date; id: string },
  clause: Record<string, unknown>,
): boolean {
  const createdAt = clause.createdAt;
  if (createdAt && typeof createdAt === "object" && "lt" in createdAt) {
    return row.createdAt < (createdAt as { lt: Date }).lt;
  }
  if (createdAt instanceof Date) {
    if (row.createdAt.getTime() !== createdAt.getTime()) return false;
    const idFilter = clause.id;
    if (idFilter && typeof idFilter === "object" && "lt" in idFilter) {
      return row.id < (idFilter as { lt: string }).lt;
    }
    return true;
  }
  return false;
}

function sortAuditsDesc(rows: ReturnType<typeof audit>[]) {
  return [...rows].sort((a, b) => {
    const dt = b.createdAt.getTime() - a.createdAt.getTime();
    if (dt !== 0) return dt;
    return b.id.localeCompare(a.id);
  });
}

function sortCommentsDesc(rows: ReturnType<typeof comment>[]) {
  return [...rows].sort((a, b) => {
    const dt = b.createdAt.getTime() - a.createdAt.getTime();
    if (dt !== 0) return dt;
    return b.id.localeCompare(a.id);
  });
}

function installTimelineMocks(
  allAudits: ReturnType<typeof audit>[],
  allComments: ReturnType<typeof comment>[],
) {
  const audits = sortAuditsDesc(allAudits);
  const comments = sortCommentsDesc(allComments);

  mocks.auditFindMany.mockImplementation(
    async (args: { where?: Record<string, unknown>; take?: number }) => {
      const take = args.take ?? audits.length;
      const where = args.where ?? {};
      let filtered = audits;
      const or = (where as { OR?: Array<Record<string, unknown>> }).OR;
      if (or) {
        filtered = audits.filter((row) =>
          or.some((clause) => matchesTimelineWhereClause(row, clause)),
        );
      }
      return filtered.slice(0, take);
    },
  );

  mocks.taskCommentFindMany.mockImplementation(
    async (args: { where?: Record<string, unknown>; take?: number }) => {
      const take = args.take ?? comments.length;
      const where = args.where ?? {};
      let filtered = comments;
      const or = (where as { OR?: Array<Record<string, unknown>> }).OR;
      if (or) {
        filtered = comments.filter((row) =>
          or.some((clause) => matchesTimelineWhereClause(row, clause)),
        );
      } else if ((where as { createdAt?: { lt?: Date } }).createdAt?.lt) {
        const lt = (where as { createdAt: { lt: Date } }).createdAt.lt;
        filtered = comments.filter((row) => row.createdAt < lt);
      }
      return filtered.slice(0, take);
    },
  );
}

function installAnchorTimelineFixtures() {
  const tNewest = new Date("2026-09-04T12:00:00.000Z");
  const tMid = new Date("2026-09-03T12:00:00.000Z");
  const tTarget = new Date("2026-09-02T12:00:00.000Z");
  const tOld = new Date("2026-09-01T12:00:00.000Z");

  installTimelineMocks(
    [
      audit("audit-newest", tNewest),
      audit("audit-mid", tMid),
      audit("audit-old", tOld),
    ],
    [comment(TARGET_COMMENT_ID, tTarget)],
  );

  return {
    pageOneEntryIds: ["audit:audit-newest", "audit:audit-mid"],
    pageTwoEntryIds: [`comment:${TARGET_COMMENT_ID}`, "audit:audit-old"],
    targetPageIndex: 2,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskFindFirst.mockResolvedValue(taskRow());
  mocks.userFindMany.mockResolvedValue([
    { id: USER, firstName: "Michael", lastName: "M", email: "m@example.com", person: null },
  ]);
  mocks.taskCommentFindFirst.mockResolvedValue({
    id: TARGET_COMMENT_ID,
    deletedAt: null,
  });
});

describe("AUFGABEN-06E-A2 comment anchor (R137)", () => {
  it("R137 resolves a comment outside page 1 via bounded timeline pagination", async () => {
    const { pageOneEntryIds, pageTwoEntryIds, targetPageIndex } =
      installAnchorTimelineFixtures();

    const pageOne = await loadTaskTimelinePage(ctx(USER), TASK, null, PAGE_SIZE);
    expect(pageOne.entries.map((entry) => entry.id)).toEqual(pageOneEntryIds);
    expect(pageOne.entries.some((entry) => entry.id === `comment:${TARGET_COMMENT_ID}`)).toBe(
      false,
    );

    const resolved = await loadTaskTimelinePageForCommentAnchor(
      ctx(USER),
      TASK,
      TARGET_COMMENT_ID,
      PAGE_SIZE,
    );

    expect(resolved.entries.map((entry) => entry.id)).toEqual(pageTwoEntryIds);
    expect(
      resolved.entries.some(
        (entry) => entry.kind === "COMMENT" && entry.id === `comment:${TARGET_COMMENT_ID}`,
      ),
    ).toBe(true);
    expect(resolved.entries[0]?.id).not.toBe(pageOneEntryIds[0]);

    const timelineLoads =
      mocks.auditFindMany.mock.calls.length + mocks.taskCommentFindMany.mock.calls.length;
    expect(timelineLoads).toBeGreaterThan(2);
    expect(timelineLoads).toBeLessThanOrEqual((TASK_TIMELINE_ANCHOR_MAX_PAGES + 1) * 2);

    expect(mocks.taskFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK, tenantId: TENANT },
      }),
    );
    expect(mocks.taskCommentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: TARGET_COMMENT_ID,
          tenantId: TENANT,
          taskId: TASK,
        },
      }),
    );

    expect(targetPageIndex).toBe(2);
  });

  it("R137 keeps canonical Task authorization on anchor resolution", async () => {
    installAnchorTimelineFixtures();

    await expect(
      loadTaskTimelinePageForCommentAnchor(ctx(OUTSIDER), TASK, TARGET_COMMENT_ID, PAGE_SIZE),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });
});
