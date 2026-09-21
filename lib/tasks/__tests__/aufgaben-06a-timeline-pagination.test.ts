/**
 * AUFGABEN-06A-A1 — heterogeneous timeline cursor pagination (P1–P15).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import {
  decodeTaskTimelineCursor,
  loadTaskTimelinePage,
} from "../task-timeline-service";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  auditFindMany: vi.fn(),
  taskCommentFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    auditLog: { findMany: mocks.auditFindMany },
    taskComment: { findMany: mocks.taskCommentFindMany },
    user: { findMany: mocks.userFindMany },
  },
}));

const TENANT = "tenant-a";
const TASK = "task-1";
const USER = "user-1";

function ctx() {
  return {
    tenantId: TENANT,
    userId: USER,
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
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: USER,
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
    action: "TASK_CREATED",
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

async function collectAllPages(pageSize: number): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null | undefined = undefined;
  for (let i = 0; i < 50; i++) {
    const page = await loadTaskTimelinePage(ctx(), TASK, cursor, pageSize);
    for (const entry of page.entries) {
      ids.push(entry.id);
    }
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return ids;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskFindFirst.mockResolvedValue(taskRow());
  mocks.userFindMany.mockResolvedValue([
    { id: USER, firstName: "Michael", lastName: "M", email: "m@example.com", person: null },
  ]);
});

describe("AUFGABEN-06A timeline pagination", () => {
  it("P1 60+ mixed entries — no duplicates or gaps", async () => {
    const audits = Array.from({ length: 35 }, (_, i) =>
      audit(`audit-${String(i).padStart(2, "0")}`, new Date(Date.UTC(2026, 8, 1, 10, i, 0))),
    );
    const comments = Array.from({ length: 30 }, (_, i) =>
      comment(`comment-${String(i).padStart(2, "0")}`, new Date(Date.UTC(2026, 8, 2, 8, i, 0))),
    );
    installTimelineMocks(audits, comments);

    const pageSize = 7;
    const seen = await collectAllPages(pageSize);
    const expectedCount = audits.length + comments.length;
    expect(seen).toHaveLength(expectedCount);
    expect(new Set(seen).size).toBe(expectedCount);
  });

  it("P2 page boundary between AuditLog and TaskComment at same timestamp", async () => {
    const same = new Date("2026-09-01T10:00:00.000Z");
    mocks.auditFindMany.mockResolvedValue([audit("audit-b", same)]);
    mocks.taskCommentFindMany.mockResolvedValue([comment("comment-a", same)]);

    installTimelineMocks([audit("audit-b", same)], [comment("comment-a", same)]);

    const first = await loadTaskTimelinePage(ctx(), TASK, undefined, 1);
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0]?.id).toBe("audit:audit-b");
    expect(first.hasMore).toBe(true);

    const second = await loadTaskTimelinePage(ctx(), TASK, first.nextCursor, 1);
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0]?.id).toBe("comment:comment-a");
  });

  it("P3 same timestamp different sources — deterministic COMMENT before AUDIT", async () => {
    const same = new Date("2026-09-01T10:00:00.000Z");
    installTimelineMocks([audit("audit-z", same)], [comment("comment-y", same)]);
    const page = await loadTaskTimelinePage(ctx(), TASK, undefined, 10);
    expect(page.entries.map((e) => e.id)).toEqual(["audit:audit-z", "comment:comment-y"]);
  });

  it("P4 same timestamp same source — id tie-break desc", async () => {
    const same = new Date("2026-09-01T10:00:00.000Z");
    installTimelineMocks(
      [],
      [comment("comment-a", same), comment("comment-m", same), comment("comment-z", same)],
    );
    const page = await loadTaskTimelinePage(ctx(), TASK, undefined, 10);
    expect(page.entries.map((e) => e.id)).toEqual([
      "comment:comment-z",
      "comment:comment-m",
      "comment:comment-a",
    ]);
  });

  it("P5 several identical timestamps across both sources paginate completely", async () => {
    const t = new Date("2026-09-01T10:00:00.000Z");
    installTimelineMocks(
      [audit("audit-1", t), audit("audit-2", t)],
      [comment("comment-1", t), comment("comment-2", t)],
    );
    const ids = await collectAllPages(2);
    expect(ids).toEqual([
      "audit:audit-2",
      "audit:audit-1",
      "comment:comment-2",
      "comment:comment-1",
    ]);
  });

  it("P6 exactly page size", async () => {
    mocks.auditFindMany.mockResolvedValue([
      audit("a1", new Date("2026-09-02T10:00:00.000Z")),
    ]);
    mocks.taskCommentFindMany.mockResolvedValue([
      comment("c1", new Date("2026-09-03T10:00:00.000Z")),
    ]);
    const page = await loadTaskTimelinePage(ctx(), TASK, undefined, 2);
    expect(page.entries).toHaveLength(2);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it("P7 page size + 1 sets hasMore", async () => {
    mocks.auditFindMany.mockResolvedValue([
      audit("a1", new Date("2026-09-01T10:00:00.000Z")),
      audit("a2", new Date("2026-09-01T09:00:00.000Z")),
    ]);
    mocks.taskCommentFindMany.mockResolvedValue([
      comment("c1", new Date("2026-09-02T10:00:00.000Z")),
    ]);
    const page = await loadTaskTimelinePage(ctx(), TASK, undefined, 2);
    expect(page.entries).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
  });

  it("P8 multiple sequential older loads", async () => {
    installTimelineMocks(
      [
        audit("a-old", new Date("2026-09-01T08:00:00.000Z")),
        audit("a-mid", new Date("2026-09-01T09:00:00.000Z")),
        audit("a-new", new Date("2026-09-01T10:00:00.000Z")),
      ],
      [],
    );
    const p1 = await loadTaskTimelinePage(ctx(), TASK, undefined, 1);
    expect(p1.hasMore).toBe(true);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await loadTaskTimelinePage(ctx(), TASK, p1.nextCursor, 1);
    expect(p2.entries.map((e) => e.id)).toEqual(["audit:a-mid"]);
    const p3 = await loadTaskTimelinePage(ctx(), TASK, p2.nextCursor, 1);
    expect([...p1.entries, ...p2.entries, ...p3.entries].map((e) => e.id)).toEqual([
      "audit:a-new",
      "audit:a-mid",
      "audit:a-old",
    ]);
  });

  it("P9 deleted comment crossing page boundary omits body", async () => {
    const t1 = new Date("2026-09-02T10:00:00.000Z");
    const t0 = new Date("2026-09-01T10:00:00.000Z");
    installTimelineMocks(
      [audit("a1", t0)],
      [{ ...comment("c-deleted", t1), deletedAt: new Date(), body: "Secret" }],
    );
    const first = await loadTaskTimelinePage(ctx(), TASK, undefined, 1);
    expect(JSON.stringify(first.entries)).not.toContain("Secret");
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBeTruthy();
    const second = await loadTaskTimelinePage(ctx(), TASK, first.nextCursor, 1);
    expect(second.entries[0]?.id).toBe("audit:a1");
  });

  it("P12 malformed cursor treated as first page", async () => {
    mocks.auditFindMany.mockResolvedValue([audit("a1", new Date())]);
    mocks.taskCommentFindMany.mockResolvedValue([]);
    const page = await loadTaskTimelinePage(ctx(), TASK, "not-valid-cursor", 5);
    expect(page.entries).toHaveLength(1);
    expect(decodeTaskTimelineCursor("not-valid-cursor")).toBeNull();
  });

  it("P14 invalid source in cursor ignored (first page semantics)", async () => {
    const raw = Buffer.from(
      JSON.stringify({
        occurredAt: new Date().toISOString(),
        source: "EVIL",
        id: "x",
      }),
      "utf8",
    ).toString("base64url");
    expect(decodeTaskTimelineCursor(raw)).toBeNull();
  });

  it("P15 future timestamp cursor returns empty page", async () => {
    mocks.auditFindMany.mockResolvedValue([audit("a1", new Date("2026-09-01T10:00:00.000Z"))]);
    mocks.taskCommentFindMany.mockResolvedValue([]);
    const future = Buffer.from(
      JSON.stringify({
        occurredAt: "2099-01-01T00:00:00.000Z",
        source: "AUDIT",
        id: "zzz",
      }),
      "utf8",
    ).toString("base64url");
    const page = await loadTaskTimelinePage(ctx(), TASK, future, 5);
    expect(page.entries).toHaveLength(0);
    expect(page.hasMore).toBe(false);
  });
});
