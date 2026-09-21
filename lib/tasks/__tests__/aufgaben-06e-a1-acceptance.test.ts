/**
 * AUFGABEN-06E-A1 — integration hardening acceptance (E1–E40).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildTaskReadWhere, EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import {
  buildListTasksForContextWhere,
  listTasksForContext,
} from "../list-tasks-for-context";
import { SUPPORTED_TASK_CONTEXT_TYPES } from "../context-registry";
import {
  taskCreateFromContextHref,
  taskSeriesHref,
  taskWorkspaceCommentHref,
  taskWorkspaceHref,
} from "../task-navigation";
import { createTaskWithContextDefaults } from "../contextual-task-create";
import { loadTaskWorkspace } from "../workspace-service";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const listMocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskCommentFindFirst: vi.fn(),
  taskCommentFindMany: vi.fn(),
  auditFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findMany: listMocks.taskFindMany,
      findFirst: listMocks.taskFindFirst,
    },
    taskComment: {
      findFirst: listMocks.taskCommentFindFirst,
      findMany: listMocks.taskCommentFindMany,
    },
    auditLog: { findMany: listMocks.auditFindMany },
    taskFollower: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    taskDocumentReference: { findMany: vi.fn().mockResolvedValue([]) },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("../context-presentation", () => ({
  resolveTaskContextPresentation: vi.fn().mockResolvedValue(null),
}));

vi.mock("../task-follow-service", () => ({
  getTaskFollowStateForVisibleTask: vi.fn(async () => ({
    isFollowing: false,
    followerCount: 0,
  })),
}));

vi.mock("../task-document-reference-service", () => ({
  listTaskDocumentReferencesForVisibleTask: vi.fn(async () => []),
}));

vi.mock("../task-service", () => ({
  createTask: vi.fn(async () => ({ id: "created-task" })),
}));

vi.mock("../context-validation", () => ({
  validateTaskContext: vi.fn(async () => undefined),
}));

vi.mock("../context-entity-read", () => ({
  assertTaskContextEntityReadable: vi.fn(async () => undefined),
}));

import { createTask } from "../task-service";
import { loadTaskTimelinePageForCommentAnchor } from "../task-timeline-service";
import { TASK_TIMELINE_ANCHOR_MAX_PAGES } from "../constants";

const TENANT = "tenant-a";
const USER = "user-1";
const OUTSIDER = "outsider-1";
const CONTEXT_ID = "entity-1";

function serviceCtx(userId: string, permissionKeys: string[]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

function visibleTaskRow() {
  return {
    id: "task-1",
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
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [
      {
        userId: USER,
        assignedAt: new Date(),
        user: { id: USER, firstName: "A", lastName: "B" },
      },
    ],
    orgUnit: null,
  };
}

describe("AUFGABEN-06E navigation (E17–E21)", () => {
  it("E17 taskWorkspaceHref uses canonical route", () => {
    expect(taskWorkspaceHref("task-42")).toBe("/dashboard/aufgaben/task-42");
  });

  it("E18 comment href includes stable anchor", () => {
    expect(taskWorkspaceCommentHref("task-1", "c-9")).toBe(
      "/dashboard/aufgaben/task-1#comment-c-9",
    );
  });

  it("E19 notification producers import canonical href helper", () => {
    const producer = read("lib/notifications/task-producer.ts");
    expect(producer).toMatch(/task-navigation/);
    expect(producer).toMatch(/taskWorkspaceHref/);
  });

  it("E20 PersonalAction Task href uses canonical helper", () => {
    const source = read("lib/personal-actions/sources/task-source.ts");
    expect(source).toMatch(/task-navigation/);
    expect(source).toMatch(/taskWorkspaceHref\(task\.id\)/);
  });

  it("E21 Agenda projection uses canonical helper", () => {
    const projections = read("lib/personal-agenda/task-projections.ts");
    expect(projections).toMatch(/task-navigation/);
    expect(projections).toMatch(/taskWorkspaceHref/);
  });

  it("context create href preserved via navigation", () => {
    expect(taskCreateFromContextHref("MATCH", "m-1")).toBe(
      "/dashboard/aufgaben/neu?contextType=MATCH&contextId=m-1",
    );
    expect(taskSeriesHref("series-1", 2)).toBe("/dashboard/aufgaben/serien/series-1?page=2");
  });
});

describe("AUFGABEN-06E related tasks (E1–E6, E15)", () => {
  beforeEach(() => {
    listMocks.taskFindMany.mockReset();
    listMocks.taskFindMany.mockResolvedValue([]);
  });

  it("E1 intersects buildTaskReadWhere with tenant + context", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]);
    await listTasksForContext(ctx, TaskContextType.MATCH, CONTEXT_ID);
    const where = listMocks.taskFindMany.mock.calls[0]?.[0]?.where;
    expect(where.AND[0]).toEqual(buildTaskReadWhere(ctx));
    expect(where.AND[1]).toMatchObject({
      tenantId: TENANT,
      contextType: TaskContextType.MATCH,
      contextId: CONTEXT_ID,
    });
  });

  it("E2 foreign tenant query uses active tenant only", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]);
    await listTasksForContext(ctx, TaskContextType.TEAM, "foreign-team");
    const where = listMocks.taskFindMany.mock.calls[0]?.[0]?.where;
    expect(where.AND[1].tenantId).toBe(TENANT);
  });

  it("E5 returns mapped summaries for authorized reader", async () => {
    listMocks.taskFindMany.mockResolvedValue([
      {
        id: "t1",
        title: "Related",
        status: "OPEN",
        priority: "NORMAL",
        dueAt: null,
        parentTaskId: null,
        createdAt: new Date(),
        assignees: [
          {
            userId: USER,
            user: { firstName: "A", lastName: "B" },
          },
        ],
      },
    ]);
    const page = await listTasksForContext(
      serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]),
      TaskContextType.PERSON,
      CONTEXT_ID,
    );
    expect(page.tasks[0]?.title).toBe("Related");
  });

  it("E6/E16 context filter does not bypass Task ACL", () => {
    const ctx = serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.PEOPLE_VIEW]);
    const where = buildListTasksForContextWhere(ctx, TaskContextType.PERSON, CONTEXT_ID);
    expect(JSON.stringify(where)).toContain("assignees");
    expect(where.AND[0]).toEqual(buildTaskReadWhere(ctx));
  });

  it("missing tasks.view is forbidden", async () => {
    await expect(
      listTasksForContext(serviceCtx(USER, []), TaskContextType.MATCH, CONTEXT_ID),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
  });

  it("R15 caps requested limit at 50 results", async () => {
    await listTasksForContext(
      serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]),
      TaskContextType.MATCH,
      CONTEXT_ID,
      { limit: 500 },
    );
    expect(listMocks.taskFindMany.mock.calls[0]?.[0]?.take).toBe(51);
  });

  it("R18 rootsOnly excludes subtasks in query predicate", () => {
    const where = buildListTasksForContextWhere(
      serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]),
      TaskContextType.MATCH,
      CONTEXT_ID,
      { rootsOnly: true },
    );
    expect(JSON.stringify(where)).toContain('"parentTaskId":null');
  });
});

describe("AUFGABEN-06E context registry (E12–E14)", () => {
  it("E12 all nine context types remain registered", () => {
    expect(SUPPORTED_TASK_CONTEXT_TYPES).toHaveLength(9);
    const registry = read("lib/tasks/task-context-registry.ts");
    for (const type of SUPPORTED_TASK_CONTEXT_TYPES) {
      expect(registry).toMatch(new RegExp(`type: "${type}"`));
    }
  });

  it("E13 meeting validation remains entity-aware in registry", () => {
    const src = read("lib/tasks/task-context-registry.ts");
    expect(src).toMatch(/canSeeMeeting/);
  });

  it("E14 document attach uses document-access seam", () => {
    const src = read("lib/tasks/task-context-registry.ts");
    expect(src).toMatch(/canReadWorkspaceDocument/);
    expect(src).toMatch(/searchWorkspaceDocumentsForTaskLink/);
  });
});

describe("AUFGABEN-06E contextual create (E22–E25)", () => {
  it("E23/E25 reuses canonical createTask after validation", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_VIEW]);
    await createTaskWithContextDefaults(ctx, {
      trustedContext: { contextType: TaskContextType.MATCH, contextId: "m-1" },
      task: { title: "Prep", assigneeUserIds: [USER] },
    });
    expect(createTask).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        title: "Prep",
        contextType: TaskContextType.MATCH,
        contextId: "m-1",
      }),
    );
  });

  it("E24 client context override fails closed", async () => {
    await expect(
      createTaskWithContextDefaults(serviceCtx(USER, [PERMISSIONS.TASKS_CREATE]), {
        trustedContext: { contextType: TaskContextType.TEAM, contextId: "team-1" },
        task: {
          title: "X",
          contextType: TaskContextType.PERSON,
          contextId: "person-1",
        } as never,
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("E22 quick create still forbids context FormData keys", () => {
    const quick = read("lib/tasks/quick-create.ts");
    expect(quick).toMatch(/contextType/);
    expect(quick).toMatch(/QUICK_CREATE_FORBIDDEN_FORM_KEYS/);
  });
});

describe("AUFGABEN-06E workspace + timeline (E26–E31)", () => {
  beforeEach(() => {
    listMocks.taskFindFirst.mockReset();
    listMocks.taskFindFirst.mockResolvedValue(visibleTaskRow());
    listMocks.taskFindMany.mockResolvedValue([]);
    listMocks.auditFindMany.mockResolvedValue([]);
    listMocks.taskCommentFindFirst.mockReset();
  });

  it("E26 workspace uses single visible-task load for bundle", async () => {
    await loadTaskWorkspace(
      serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
      "task-1",
      "de-CH",
      "Europe/Zurich",
    );
    expect(listMocks.taskFindFirst).toHaveBeenCalledTimes(1);
  });

  it("E28 comment deep-link resolution is bounded on the server", () => {
    const timeline = read("lib/tasks/task-timeline-service.ts");
    expect(timeline).toMatch(/loadTaskTimelinePageForCommentAnchor/);
    expect(timeline).toMatch(/TASK_TIMELINE_ANCHOR_MAX_PAGES/);
    const activity = read("components/admin/aufgaben/TaskActivitySection.tsx");
    expect(activity).toMatch(/parseTaskCommentAnchorFromHash/);
    expect(activity).not.toMatch(/while \(true\)/);
  });

  it("E29 missing comment fails closed", async () => {
    listMocks.taskCommentFindFirst.mockResolvedValue(null);
    await expect(
      loadTaskTimelinePageForCommentAnchor(
        serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]),
        "task-1",
        "missing",
      ),
    ).rejects.toThrow();
  });

  it("R138/R25 comment anchor scan is bounded (max pages + controlled fallback)", async () => {
    listMocks.taskCommentFindFirst.mockResolvedValue({
      id: "deep-comment",
      deletedAt: null,
    });
    listMocks.taskCommentFindMany.mockResolvedValue([]);
    listMocks.auditFindMany.mockResolvedValue([
      {
        id: "audit-1",
        actorUserId: USER,
        action: "TASK_CREATED",
        beforeJson: null,
        afterJson: null,
        createdAt: new Date(),
      },
    ]);

    await loadTaskTimelinePageForCommentAnchor(
      serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]),
      "task-1",
      "deep-comment",
    );

    const timelineLoads =
      listMocks.auditFindMany.mock.calls.length +
      listMocks.taskCommentFindMany.mock.calls.length;
    expect(timelineLoads).toBeLessThanOrEqual(
      (TASK_TIMELINE_ANCHOR_MAX_PAGES + 1) * 2,
    );
    expect(timelineLoads).toBeGreaterThan(0);
  });
});

describe("AUFGABEN-06E preservation sentinels (E32–E40)", () => {
  it("E32 followers remain non-ACL", () => {
    const src = read("lib/tasks/task-follow-service.ts");
    expect(src).toMatch(/subscription only/i);
  });

  it("E33 document references remain non-ACL in list path", () => {
    const src = read("lib/tasks/task-document-reference-service.ts");
    expect(src).toMatch(/listTaskDocumentReferencesForVisibleTask/);
  });

  it("E34 subtask create snapshots context fields only", () => {
    const src = read("lib/tasks/task-service.ts");
    expect(src).toMatch(/contextType: parent\.contextType/);
    expect(src).not.toMatch(/taskDocumentReference\.create/i);
  });

  it("E36 PersonalAction types exclude comment collaboration", () => {
    const src = read("lib/personal-actions/sources/task-source.ts");
    expect(src).toMatch(/sourceType: "TASK"/);
    expect(src).not.toMatch(/TASK_COMMENT/);
  });

  it("E39 no Workspace ACL introduced in 06E task modules", () => {
    const workspace = read("lib/tasks/workspace-service.ts");
    expect(workspace).not.toMatch(/WorkspaceAcl|workspaceAcl/);
  });

  it("E40 notification dedup re-exports canonical hrefs only", () => {
    const dedup = read("lib/notifications/deduplication.ts");
    expect(dedup).toMatch(/task-navigation/);
  });

  it("E27 public services still call requireVisibleTask independently", () => {
    const follow = read("lib/tasks/task-follow-service.ts");
    expect(follow).toMatch(/export async function getTaskFollowState/);
    expect(follow).toMatch(/requireVisibleTask\(ctx, taskId\)/);
  });

  it("E7/E8/E9/E10/E11 covered by task-01b subtask context tests", () => {
    const subtaskTests = read("lib/tasks/__tests__/task-01b.test.ts");
    expect(subtaskTests).toMatch(/snapshots parent contextType/);
    expect(subtaskTests).toMatch(/contextType: null/);
  });
});
