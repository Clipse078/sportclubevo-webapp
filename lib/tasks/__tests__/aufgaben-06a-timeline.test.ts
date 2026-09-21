/**
 * AUFGABEN-06A — task timeline mapper and page loader (T1–T18).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import {
  mapAuditLogToTimelineEntry,
  mapCommentToTimelineEntry,
  timelineEntryHasRawAuditPayload,
} from "../task-timeline-mapper";
import type { TaskCommentDto } from "../task-comment-enrichment";
import { decodeTaskTimelineCursor, loadTaskTimelinePage } from "../task-timeline-service";

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
    assignees: [{ userId: USER, assignedAt: new Date(), user: { id: USER, firstName: "M", lastName: "Michael" } }],
    orgUnit: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskFindFirst.mockResolvedValue(taskRow());
  mocks.userFindMany.mockResolvedValue([
    { id: USER, firstName: "Michael", lastName: "M", email: "m@example.com", person: null },
  ]);
});

describe("AUFGABEN-06A timeline mapper", () => {
  const actor = "Michael";

  it("T1 TASK_CREATED mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a1",
        actorUserId: USER,
        action: "TASK_CREATED",
        beforeJson: null,
        afterJson: { title: "X" },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("hat die Aufgabe erstellt");
  });

  it("T2 TASK_ASSIGNED mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a2",
        actorUserId: USER,
        action: "TASK_ASSIGNED",
        beforeJson: null,
        afterJson: { assigneeUserIds: ["u2"] },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map([["u2", "Sandra"]]),
    );
    expect(entry.title).toContain("Sandra");
  });

  it("T3 TASK_UPDATED mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a3",
        actorUserId: USER,
        action: "TASK_UPDATED",
        beforeJson: { title: "Alt" },
        afterJson: { title: "Neu" },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("aktualisiert");
  });

  it("T4 TASK_COMPLETED mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a4",
        actorUserId: USER,
        action: "TASK_COMPLETED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("abgeschlossen");
  });

  it("T5 TASK_CANCELLED mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a5",
        actorUserId: USER,
        action: "TASK_CANCELLED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("abgebrochen");
  });

  it("T5b document link mapped without document title", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a5b",
        actorUserId: USER,
        action: "TASK_DOCUMENT_LINKED",
        beforeJson: null,
        afterJson: { documentId: "doc-secret" },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("Dokument verknüpft");
    expect(entry.title).not.toContain("doc-secret");
  });

  it("T6 generated occurrence mapped", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a6",
        actorUserId: USER,
        action: "TASK_OCCURRENCE_GENERATED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("Serientermin");
  });

  it("T7 unknown action safe", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a7",
        actorUserId: USER,
        action: "TASK_MYSTERY",
        beforeJson: { secret: true },
        afterJson: { secret: true },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(entry.title).toContain("bearbeitet");
    expect(timelineEntryHasRawAuditPayload(entry)).toBe(false);
  });

  it("T8/T9 raw before/after absent from DTO", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a8",
        actorUserId: USER,
        action: "TASK_UPDATED",
        beforeJson: { internal: "x" },
        afterJson: { internal: "y" },
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      actor,
      new Map(),
    );
    expect(JSON.stringify(entry)).not.toContain("beforeJson");
    expect(JSON.stringify(entry)).not.toContain("afterJson");
  });

  it("T12 deleted comment rendered without body", () => {
    const entry = mapCommentToTimelineEntry({
      id: "c1",
      taskId: TASK,
      authorUserId: USER,
      authorDisplayName: actor,
      body: null,
      mentions: [],
      isDeleted: true,
      isEdited: false,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
    expect(entry.body).toBeNull();
    expect(entry.isDeleted).toBe(true);
  });

  it("T13 edited comment marker", () => {
    const entry = mapCommentToTimelineEntry({
      id: "c1",
      taskId: TASK,
      authorUserId: USER,
      authorDisplayName: actor,
      body: "Text",
      mentions: [],
      isDeleted: false,
      isEdited: true,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
    } satisfies TaskCommentDto);
    expect(entry.isEdited).toBe(true);
  });
});

describe("AUFGABEN-06A timeline page loader", () => {
  it("T10/T11 comment merged with audit and ordered newest first", async () => {
    mocks.auditFindMany.mockResolvedValue([
      {
        id: "audit-old",
        actorUserId: USER,
        action: "TASK_CREATED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
    ]);
    mocks.taskCommentFindMany.mockResolvedValue([
      {
        id: "comment-new",
        tenantId: TENANT,
        taskId: TASK,
        authorUserId: USER,
        body: "Neu",
        deletedAt: null,
        createdAt: new Date("2026-09-02T10:00:00.000Z"),
        updatedAt: new Date("2026-09-02T10:00:00.000Z"),
        mentions: [],
      },
    ]);

    const page = await loadTaskTimelinePage(ctx(), TASK);
    expect(page.entries).toHaveLength(2);
    expect(page.entries[0]?.id).toBe("comment:comment-new");
    expect(page.entries[1]?.id).toBe("audit:audit-old");
  });

  it("T14 actor batch hydration", async () => {
    mocks.auditFindMany.mockResolvedValue([
      {
        id: "audit-1",
        actorUserId: USER,
        action: "TASK_CREATED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
    ]);
    mocks.taskCommentFindMany.mockResolvedValue([]);
    const page = await loadTaskTimelinePage(ctx(), TASK);
    expect(page.entries[0]?.actor.displayName).toBe("Michael M");
    expect(mocks.userFindMany).toHaveBeenCalledTimes(1);
  });

  it("T15/T16 tenant and task filtering", async () => {
    mocks.auditFindMany.mockResolvedValue([]);
    mocks.taskCommentFindMany.mockResolvedValue([]);
    await loadTaskTimelinePage(ctx(), TASK);
    expect(mocks.auditFindMany.mock.calls[0]?.[0].where).toMatchObject({
      tenantId: TENANT,
      moduleKey: "tasks",
      entityType: "Task",
      entityId: TASK,
    });
  });

  it("T17 cursor older page", async () => {
    mocks.auditFindMany.mockResolvedValue([]);
    mocks.taskCommentFindMany.mockResolvedValue([]);
    const first = await loadTaskTimelinePage(ctx(), TASK);
    if (first.nextCursor) {
      await loadTaskTimelinePage(ctx(), TASK, first.nextCursor);
      expect(decodeTaskTimelineCursor(first.nextCursor)).not.toBeNull();
    }
    expect(first.hasMore).toBe(false);
  });

  it("T18 deterministic same-timestamp ordering", async () => {
    const same = new Date("2026-09-01T10:00:00.000Z");
    mocks.auditFindMany.mockResolvedValue([
      {
        id: "audit-b",
        actorUserId: USER,
        action: "TASK_CREATED",
        beforeJson: null,
        afterJson: null,
        createdAt: same,
      },
    ]);
    mocks.taskCommentFindMany.mockResolvedValue([
      {
        id: "comment-a",
        tenantId: TENANT,
        taskId: TASK,
        authorUserId: USER,
        body: "x",
        deletedAt: null,
        createdAt: same,
        updatedAt: same,
        mentions: [],
      },
    ]);
    const page = await loadTaskTimelinePage(ctx(), TASK);
    expect(page.entries[0]?.kind).toBe("AUDIT");
    expect(page.entries[1]?.kind).toBe("COMMENT");
  });
});
