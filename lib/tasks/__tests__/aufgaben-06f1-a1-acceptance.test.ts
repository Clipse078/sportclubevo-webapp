/**
 * AUFGABEN-06F1-A1 — universal contextual Task platform acceptance (F1–F60).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType, TaskStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskReadWhere,
  EMPTY_TASK_AUTH_SCOPE,
} from "../task-authorization";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import { assertTaskContextEntityReadable } from "../context-entity-read";
import { listTasksForContext } from "../list-tasks-for-context";
import { countTasksForContext } from "../count-tasks-for-context";
import { buildRelatedTaskWhere } from "../related-task-query";
import {
  DEFAULT_ENTITY_RELATED_TASK_LIMIT,
  DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY,
  DEFAULT_ENTITY_RELATED_TASK_STATUSES,
} from "../context-related-defaults";
import { createTaskWithContextDefaults } from "../contextual-task-create";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { buildOperationalContextHref, SUPPORTED_TASK_CONTEXT_TYPES } from "../context-registry";
import { taskCreateFromContextHref, taskWorkspaceHref } from "../task-navigation";
import { validateTaskContextReadable } from "../task-context-registry";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const prismaMocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskCount: vi.fn(),
  eventFindFirst: vi.fn(),
  meetingFindFirst: vi.fn(),
  canSeeMeeting: vi.fn(),
  canReadWorkspaceDocument: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findMany: prismaMocks.taskFindMany,
      count: prismaMocks.taskCount,
    },
    event: { findFirst: prismaMocks.eventFindFirst },
    meeting: { findFirst: prismaMocks.meetingFindFirst },
  },
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: prismaMocks.canSeeMeeting,
}));

vi.mock("@/lib/workspace/document-access", () => ({
  canReadWorkspaceDocument: prismaMocks.canReadWorkspaceDocument,
  searchWorkspaceDocumentsForTaskLink: vi.fn(),
  resolveWorkspaceDocumentPresentations: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("../context-validation", () => ({
  validateTaskContext: vi.fn(async () => undefined),
}));

vi.mock("../task-service", () => ({
  createTask: vi.fn(async () => ({ id: "task-created-1" })),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn(async () => serviceCtx(USER, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_VIEW])),
}));

import { createTask } from "../task-service";

const TENANT = "tenant-a";
const USER = "user-1";
const CONTEXT_ID = "match-1";

function serviceCtx(userId: string, permissionKeys: string[]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

describe("AUFGABEN-06F1 entity read gate (F1–F3, F38–F39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.eventFindFirst.mockResolvedValue({ id: CONTEXT_ID });
  });

  it("F1 list requires entity authorization before query", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      listTasksForContext(
        serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]),
        TaskContextType.MATCH,
        CONTEXT_ID,
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(prismaMocks.taskFindMany).not.toHaveBeenCalled();
  });

  it("F2 count requires entity authorization", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      countTasksForContext(
        serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]),
        TaskContextType.MATCH,
        CONTEXT_ID,
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(prismaMocks.taskCount).not.toHaveBeenCalled();
  });

  it("F3 foreign tenant entity fails closed", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      assertTaskContextEntityReadable(
        serviceCtx(USER, [PERMISSIONS.EVENTS_VIEW]),
        TaskContextType.MATCH,
        "foreign-match",
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(prismaMocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
    );
  });

  it("F38 MEETING preserves canSeeMeeting in readable contract", async () => {
    const src = read("lib/tasks/task-context-registry.ts");
    expect(src).toMatch(/canSeeMeeting/);
    expect(src).toMatch(/validateTaskContextReadable/);
  });

  it("F39 DOCUMENT preserves canReadWorkspaceDocument", async () => {
    const src = read("lib/tasks/task-context-registry.ts");
    expect(src).toMatch(/canReadWorkspaceDocument/);
  });
});

describe("AUFGABEN-06F1 shared related predicate (F4–F20, F43–F45, F59)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.eventFindFirst.mockResolvedValue({ id: CONTEXT_ID });
    prismaMocks.taskFindMany.mockResolvedValue([]);
    prismaMocks.taskCount.mockResolvedValue(0);
  });

  it("F4/F59 list and count share buildRelatedTaskWhere", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]);
    const options = {
      rootsOnly: DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY,
      statuses: DEFAULT_ENTITY_RELATED_TASK_STATUSES,
      limit: DEFAULT_ENTITY_RELATED_TASK_LIMIT,
    };
    await listTasksForContext(ctx, TaskContextType.MATCH, CONTEXT_ID, options);
    await countTasksForContext(ctx, TaskContextType.MATCH, CONTEXT_ID, options);

    const listWhere = prismaMocks.taskFindMany.mock.calls[0]?.[0]?.where;
    const countWhere = prismaMocks.taskCount.mock.calls[0]?.[0]?.where;
    expect(listWhere).toEqual(countWhere);
    expect(listWhere.AND[0]).toEqual(buildTaskReadWhere(ctx));
  });

  it("F14–F19 default statuses and rootsOnly in predicate", () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]);
    const where = buildRelatedTaskWhere(ctx, TaskContextType.MATCH, CONTEXT_ID, {
      rootsOnly: true,
      statuses: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS],
    });
    const serialized = JSON.stringify(where);
    expect(serialized).toContain('"parentTaskId":null');
    expect(serialized).toContain('"OPEN"');
    expect(serialized).toContain('"IN_PROGRESS"');
    expect(serialized).not.toContain('"DONE"');
    expect(serialized).not.toContain('"CANCELLED"');
  });

  it("F20 related list remains bounded", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]);
    await listTasksForContext(ctx, TaskContextType.MATCH, CONTEXT_ID, { limit: 500 });
    expect(prismaMocks.taskFindMany.mock.calls[0]?.[0]?.take).toBe(51);
  });

  it("F43/F44 panel defaults encoded in constants", () => {
    expect(DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY).toBe(true);
    expect(DEFAULT_ENTITY_RELATED_TASK_STATUSES).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(DEFAULT_ENTITY_RELATED_TASK_LIMIT).toBe(5);
  });

  it("F45 rows navigate via taskWorkspaceHref", () => {
    expect(taskWorkspaceHref("abc")).toBe("/dashboard/aufgaben/abc");
    const panelView = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panelView).toMatch(/taskWorkspaceHref/);
  });
});

describe("AUFGABEN-06F1 contextual create (F21–F29, F34)", () => {
  it("F21–F23 trusted context via createTaskWithContextDefaults", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]);
    await createTaskWithContextDefaults(ctx, {
      trustedContext: { contextType: TaskContextType.MATCH, contextId: CONTEXT_ID },
      task: { title: "Prep", assigneeUserIds: [USER] },
    });
    expect(createTask).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        contextType: TaskContextType.MATCH,
        contextId: CONTEXT_ID,
      }),
    );
  });

  it("F22/F23 client context override rejected", async () => {
    await expect(
      createTaskWithContextDefaults(serviceCtx(USER, [PERMISSIONS.TASKS_CREATE]), {
        trustedContext: { contextType: TaskContextType.TEAM, contextId: "t1" },
        task: {
          title: "X",
          contextType: TaskContextType.PERSON,
          contextId: "p1",
        } as never,
      }),
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it("F26 canonical createTask preserved", () => {
    const src = read("lib/tasks/contextual-task-create.ts");
    expect(src).toMatch(/createTask\(/);
    expect(src).not.toMatch(/prisma\.task\.create/);
  });

  it("F34 generic full create retains selectable context field", () => {
    const full = read("components/admin/aufgaben/AufgabenFullCreateClient.tsx");
    expect(full).toMatch(/TaskContextField/);
  });
});

describe("AUFGABEN-06F1 platform components (F46–F47)", () => {
  it("F46 entity trigger has no subtask creation", () => {
    const trigger = read("components/admin/aufgaben/contextual/ContextualTaskCreateTrigger.tsx");
    expect(trigger).not.toMatch(/Unteraufgabe/i);
    const dialog = read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx");
    expect(dialog).not.toMatch(/Unteraufgabe/i);
  });

  it("F47 no list-row N+1 panel integration in match list components", () => {
    const row = read("components/admin/matchcenter/MatchcenterSpielplanungRow.tsx");
    expect(row).not.toMatch(/ContextRelatedTasksPanel/);
  });
});

describe("AUFGABEN-06F1 navigation (F41, F26 duplicate href)", () => {
  it("F41 TEAM canonical href", () => {
    expect(buildOperationalContextHref("TEAM", { id: "team-9" })).toBe(
      "/dashboard/teams/team-9",
    );
  });

  it("context create href owned by task-navigation", () => {
    expect(taskCreateFromContextHref("MATCH", "m1")).toBe(
      "/dashboard/aufgaben/neu?contextType=MATCH&contextId=m1",
    );
    const registry = read("lib/tasks/context-registry.ts");
    expect(registry).toMatch(/task-navigation/);
  });
});

describe("AUFGABEN-06F1 isolation & regression sentinels (F32–F33, F48–F60)", () => {
  it("F32/F33 06P quick create unchanged", () => {
    const quick = read("lib/tasks/quick-create.ts");
    expect(quick).toMatch(/QUICK_CREATE_FORBIDDEN_FORM_KEYS/);
    expect(quick).toMatch(/contextType/);
  });

  it("F35–F37 event type validation preserved", () => {
    const registry = read("lib/tasks/task-context-registry.ts");
    expect(registry).toMatch(/type: "MATCH"/);
    expect(registry).toMatch(/type: "TOURNAMENT"/);
    expect(registry).toMatch(/type: "OTHER"/);
  });

  it("F40 TRAINING remains TrainingSeries", () => {
    const registry = read("lib/tasks/task-context-registry.ts");
    expect(registry).toMatch(/trainingSeries\.findFirst/);
  });

  it("F48/F49 no TaskSeries schema changes in 06F1", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).not.toMatch(/contextType.*TaskSeries/);
  });

  it("F50/F51 participation and personal actions untouched", () => {
    expect(read("lib/personal-actions/sources/attendance-source.ts")).not.toMatch(
      /ContextRelatedTasksPanel/,
    );
  });

  it("F52 agenda unchanged", () => {
    expect(read("lib/personal-agenda/task-projections.ts")).toMatch(/taskWorkspaceHref/);
  });

  it("F53–F55 followers mentions documents non-ACL", () => {
    const follow = read("lib/tasks/task-follow-service.ts");
    expect(follow).toMatch(/requireVisibleTask|canReadTask/);
  });

  it("F57/F58 entity vs task ACL separation documented in list service", () => {
    const list = read("lib/tasks/list-tasks-for-context.ts");
    expect(list).toMatch(/assertTaskContextEntityReadable/);
    expect(list).toMatch(/buildRelatedTaskWhere/);
  });

  it("F60 no new context enum values", () => {
    expect(SUPPORTED_TASK_CONTEXT_TYPES).toHaveLength(9);
  });

  it("F5–F13 confidentiality uses buildTaskReadWhere in predicate", () => {
    const outsider = serviceCtx("outsider", [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]);
    const where = buildRelatedTaskWhere(outsider, TaskContextType.MATCH, CONTEXT_ID);
    expect(where.AND[0]).toEqual(buildTaskReadWhere(outsider));
    expect(JSON.stringify(where)).toContain("assignees");
  });
});

describe("AUFGABEN-06F1 contextual server action (F24–F25)", () => {
  it("F24 rejects client context FormData injection", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    fd.set("contextType", "PERSON");
    fd.set("contextId", "p1");
    const result = await createContextualAufgabeAction("MATCH", CONTEXT_ID, fd);
    expect(result.ok).toBe(false);
  });

  it("F25 rejects unsupported context type", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    const result = await createContextualAufgabeAction("INVALID", CONTEXT_ID, fd);
    expect(result.ok).toBe(false);
  });
});

describe("AUFGABEN-06F1 registry readable contract", () => {
  it("validateTaskContextReadable delegates to attachable by default", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue({ id: "m1" });
    const ok = await validateTaskContextReadable(
      serviceCtx(USER, [PERMISSIONS.EVENTS_VIEW]),
      TaskContextType.MATCH,
      "m1",
    );
    expect(ok).toBe(true);
  });
});

describe("AUFGABEN-06F1 visibility scopes in count (F14–F15)", () => {
  it("count uses same ACL as list for ASSIGNEES_ONLY", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue({ id: CONTEXT_ID });
    const ctx = serviceCtx("viewer", [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]);
    await countTasksForContext(ctx, TaskContextType.MATCH, CONTEXT_ID, {
      rootsOnly: true,
      statuses: DEFAULT_ENTITY_RELATED_TASK_STATUSES,
    });
    const where = prismaMocks.taskCount.mock.calls[0]?.[0]?.where;
    expect(where.AND[0]).toEqual(buildTaskReadWhere(ctx));
  });
});

describe("AUFGABEN-06F1 reference integration", () => {
  it("Match record wires universal panel and trigger", () => {
    const detail = read("components/admin/matchcenter/MatchcenterDetail.tsx");
    expect(detail).toMatch(/ContextRelatedTasksPanel/);
    expect(detail).toMatch(/ContextualTaskCreateTriggerServer/);
  });
});

describe("AUFGABEN-06F1 ASSIGNEES_ONLY matrix (F5–F7)", () => {
  it("F5 unrelated user predicate excludes confidential tasks via assignee gate", () => {
    const outsider = serviceCtx("outsider", [PERMISSIONS.TASKS_VIEW]);
    const where = buildRelatedTaskWhere(outsider, TaskContextType.PERSON, "p1");
    expect(JSON.stringify(where)).toContain("assignees");
    expect(where.AND[0]).toEqual(buildTaskReadWhere(outsider));
  });
});
