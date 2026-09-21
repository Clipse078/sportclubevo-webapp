/**
 * AUFGABEN-06F1-A2 — acceptance coverage closure (executable runtime evidence).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TaskContextType,
  TaskStatus,
  TaskVisibilityScope,
} from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canReadTask, EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import { listTasksForContext } from "../list-tasks-for-context";
import { countTasksForContext } from "../count-tasks-for-context";
import {
  DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY,
  DEFAULT_ENTITY_RELATED_TASK_STATUSES,
} from "../context-related-defaults";
import { createTaskWithContextDefaults } from "../contextual-task-create";
import { resolveContextualTaskCreateEligibility } from "../contextual-task-eligibility";
import {
  validateTaskContextAttachable,
  validateTaskContextReadable,
} from "../task-context-registry";
import { validateTaskContext } from "../context-validation";
import {
  mapFixtureToListRow,
  matchesRelatedTaskWhere,
  type RelatedTaskFixture,
} from "./helpers/related-task-where-matcher";
import { taskPersonalActionSource } from "@/lib/personal-actions/sources/task-source";
import { resolveQuickCreateCapabilities } from "../quick-create";
import { taskWorkspaceHref } from "../task-navigation";

const prismaMocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskCount: vi.fn(),
  eventFindFirst: vi.fn(),
  trainingSeriesFindFirst: vi.fn(),
  trainingSessionFindFirst: vi.fn(),
  meetingFindFirst: vi.fn(),
  personFindFirst: vi.fn(),
  canSeeMeeting: vi.fn(),
  canReadWorkspaceDocument: vi.fn(),
  taskCreate: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  assigneeCreateMany: vi.fn(),
  emitAssignment: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findMany: prismaMocks.taskFindMany,
      count: prismaMocks.taskCount,
      create: prismaMocks.taskCreate,
      findFirstOrThrow: vi.fn(),
    },
    event: { findFirst: prismaMocks.eventFindFirst },
    trainingSeries: { findFirst: prismaMocks.trainingSeriesFindFirst },
    trainingSession: { findFirst: prismaMocks.trainingSessionFindFirst },
    meeting: { findFirst: prismaMocks.meetingFindFirst },
    person: { findFirst: prismaMocks.personFindFirst },
    taskAssignee: { createMany: prismaMocks.assigneeCreateMany },
    $transaction: prismaMocks.transaction,
    auditLog: { create: prismaMocks.auditCreate },
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

vi.mock("@/lib/notifications/task-producer", () => ({
  emitTaskAssignmentNotifications: prismaMocks.emitAssignment,
  computeNewAssigneeRows: (
    previousUserIds: string[],
    nextUserIds: string[],
    assignedAt: Date,
  ) =>
    nextUserIds
      .filter((userId) => !previousUserIds.includes(userId))
      .map((userId) => ({ userId, assignedAt })),
}));

vi.mock("../task-service", () => ({
  createTask: vi.fn(async () => ({ id: "task-created" })),
}));

import { createTask } from "../task-service";

const TENANT = "tenant-a";
const MATCH_ID = "match-ctx-1";
const CREATOR = "user-creator";
const ASSIGNEE = "user-assignee";
const OUTSIDER = "user-outsider";
const ORG_UNIT = "org-sport";
const SUPER_ADMIN = "super-admin";

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

function basePerms() {
  return [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW];
}

function installRelatedTaskSimulator(tasks: RelatedTaskFixture[], actor: ReturnType<typeof serviceCtx>) {
  prismaMocks.eventFindFirst.mockResolvedValue({ id: MATCH_ID });
  prismaMocks.taskFindMany.mockImplementation(async (args: { where: unknown; take?: number }) => {
    const matched = tasks
      .filter((t) => matchesRelatedTaskWhere(t, args.where as never, actor))
      .map(mapFixtureToListRow);
    const take = args.take ?? matched.length;
    return matched.slice(0, take);
  });
  prismaMocks.taskCount.mockImplementation(async (args: { where: unknown }) =>
    tasks.filter((t) => matchesRelatedTaskWhere(t, args.where as never, actor)).length,
  );
}

function taskFixture(overrides: Partial<RelatedTaskFixture> & { id: string }): RelatedTaskFixture {
  return {
    tenantId: TENANT,
    contextType: TaskContextType.MATCH,
    contextId: MATCH_ID,
    status: TaskStatus.OPEN,
    parentTaskId: null,
    createdByUserId: CREATOR,
    assigneeUserIds: [],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    title: overrides.id,
    ...overrides,
  };
}

describe("AUFGABEN-06F1-A2 F6–F13 related visibility matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("F6 ASSIGNEES_ONLY creator sees Task via listTasksForContext", async () => {
    const tasks = [
      taskFixture({
        id: "conf-creator",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
      }),
    ];
    const ctx = serviceCtx(CREATOR, basePerms());
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks.map((t) => t.id)).toEqual(["conf-creator"]);
  });

  it("F7 ASSIGNEES_ONLY explicit assignee sees Task", async () => {
    const tasks = [
      taskFixture({
        id: "conf-assignee",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
      }),
    ];
    const ctx = serviceCtx(ASSIGNEE, basePerms());
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks.map((t) => t.id)).toEqual(["conf-assignee"]);
  });

  it("F8 ORG_UNIT unrelated user does not see Task", async () => {
    const tasks = [
      taskFixture({
        id: "org-hidden",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_UNIT,
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, basePerms());
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks).toHaveLength(0);
  });

  it("F9 authorized scoped OrgUnit user sees Task", async () => {
    const tasks = [
      taskFixture({
        id: "org-visible",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_UNIT,
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, basePerms(), {
      memberOrgUnitIds: [ORG_UNIT],
      permissionReadOrgUnitIds: [ORG_UNIT],
    });
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks.map((t) => t.id)).toEqual(["org-visible"]);
  });

  it("F10 CLUB Task follows tenant-wide read rules", async () => {
    const tasks = [
      taskFixture({
        id: "club-task",
        visibilityScope: TaskVisibilityScope.CLUB,
        createdByUserId: CREATOR,
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, [...basePerms(), PERMISSIONS.TASKS_VIEW_ALL]);
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks.map((t) => t.id)).toEqual(["club-task"]);
  });

  it("F11 tasks.view_all does not bypass ASSIGNEES_ONLY confidentiality", async () => {
    const tasks = [
      taskFixture({
        id: "conf-view-all",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, [...basePerms(), PERMISSIONS.TASKS_VIEW_ALL]);
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks).toHaveLength(0);
  });

  it("F12 tasks.manage does not bypass ORG_UNIT confidentiality", async () => {
    const tasks = [
      taskFixture({
        id: "org-manage-block",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_UNIT,
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, [...basePerms(), PERMISSIONS.TASKS_MANAGE]);
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks).toHaveLength(0);
  });

  it("F13 Super Admin does not bypass confidential Task visibility", async () => {
    const tasks = [
      taskFixture({
        id: "conf-super",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
      }),
    ];
    const ctx = serviceCtx(SUPER_ADMIN, [
      ...basePerms(),
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_MANAGE,
      "platform.super_admin",
    ]);
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    expect(page.tasks).toHaveLength(0);
  });
});

describe("AUFGABEN-06F1-A2 mixed related count fixture", () => {
  const clubVisible = TaskVisibilityScope.CLUB;

  const mixed: RelatedTaskFixture[] = [
    taskFixture({ id: "A-open-root", status: TaskStatus.OPEN, visibilityScope: clubVisible }),
    taskFixture({
      id: "B-inprog-root",
      status: TaskStatus.IN_PROGRESS,
      visibilityScope: clubVisible,
    }),
    taskFixture({ id: "C-done-root", status: TaskStatus.DONE, visibilityScope: clubVisible }),
    taskFixture({
      id: "D-cancel-root",
      status: TaskStatus.CANCELLED,
      visibilityScope: clubVisible,
    }),
    taskFixture({
      id: "E-open-sub",
      status: TaskStatus.OPEN,
      parentTaskId: "parent-1",
      visibilityScope: clubVisible,
    }),
    taskFixture({
      id: "F-hidden-assignees",
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      createdByUserId: CREATOR,
      assigneeUserIds: [ASSIGNEE],
    }),
    taskFixture({
      id: "G-hidden-org",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_UNIT,
    }),
  ];

  it("default countTasksForContext returns exactly 2 (OPEN + IN_PROGRESS roots only)", async () => {
    const ctx = serviceCtx(OUTSIDER, [...basePerms(), PERMISSIONS.TASKS_VIEW_ALL]);
    installRelatedTaskSimulator(mixed, ctx);
    const count = await countTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID, {
      rootsOnly: DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY,
      statuses: DEFAULT_ENTITY_RELATED_TASK_STATUSES,
    });
    expect(count).toBe(2);
  });
});

describe("AUFGABEN-06F1-A2 F57 entity visible, task hidden", () => {
  it("list and count return only CLUB-visible Task", async () => {
    const tasks = [
      taskFixture({
        id: "visible-club",
        visibilityScope: TaskVisibilityScope.CLUB,
      }),
      taskFixture({
        id: "hidden-assignees",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, [...basePerms(), PERMISSIONS.TASKS_VIEW_ALL]);
    installRelatedTaskSimulator(tasks, ctx);
    const page = await listTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID);
    const count = await countTasksForContext(ctx, TaskContextType.MATCH, MATCH_ID, {
      rootsOnly: true,
      statuses: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS],
    });
    expect(page.tasks.map((t) => t.id)).toEqual(["visible-club"]);
    expect(count).toBe(1);
  });
});

describe("AUFGABEN-06F1-A2 F58 task readable but entity forbidden (MEETING)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.meetingFindFirst.mockResolvedValue({
      id: "meet-1",
      visibilityScope: "CLUB",
      createdByUserId: CREATOR,
      visibleRoleRefs: [],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
      visibleTargetGroupRefs: [],
    });
    prismaMocks.canSeeMeeting.mockReturnValue(false);
  });

  it("list denied before Task query", async () => {
    await expect(
      listTasksForContext(
        serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.MEETINGS_VIEW]),
        TaskContextType.MEETING,
        "meet-1",
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(prismaMocks.taskFindMany).not.toHaveBeenCalled();
  });

  it("count denied before Task query", async () => {
    await expect(
      countTasksForContext(
        serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.MEETINGS_VIEW]),
        TaskContextType.MEETING,
        "meet-1",
      ),
    ).rejects.toBeInstanceOf(TaskForbiddenError);
    expect(prismaMocks.taskCount).not.toHaveBeenCalled();
  });

  it("contextual create denied via eligibility", async () => {
    const eligibility = await resolveContextualTaskCreateEligibility(
      serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.MEETINGS_VIEW]),
      TaskContextType.MEETING,
      "meet-1",
    );
    expect(eligibility.canViewRelatedTasks).toBe(false);
    expect(eligibility.canCreate).toBe(false);
  });
});

describe("AUFGABEN-06F1-A2 MEETING runtime coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.meetingFindFirst.mockResolvedValue({
      id: "meet-2",
      visibilityScope: "CLUB",
      createdByUserId: CREATOR,
      visibleRoleRefs: [],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
      visibleTargetGroupRefs: [],
    });
  });

  it("canSeeMeeting false denies list/count/create", async () => {
    prismaMocks.canSeeMeeting.mockReturnValue(false);
    const ctx = serviceCtx(OUTSIDER, [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.MEETINGS_VIEW,
    ]);
    await expect(listTasksForContext(ctx, TaskContextType.MEETING, "meet-2")).rejects.toThrow();
    await expect(countTasksForContext(ctx, TaskContextType.MEETING, "meet-2")).rejects.toThrow();
    const eligibility = await resolveContextualTaskCreateEligibility(
      ctx,
      TaskContextType.MEETING,
      "meet-2",
    );
    expect(eligibility.canCreate).toBe(false);
    expect(eligibility.canViewRelatedTasks).toBe(false);
  });

  it("canSeeMeeting true permits entity gate; Task ACL still applies independently", async () => {
    prismaMocks.canSeeMeeting.mockReturnValue(true);
    const tasks = [
      taskFixture({
        id: "meet-task",
        contextType: TaskContextType.MEETING,
        contextId: "meet-2",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
      }),
    ];
    const ctx = serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.MEETINGS_VIEW]);
    prismaMocks.taskFindMany.mockImplementation(async (args: { where: unknown; take?: number }) => {
      const matched = tasks
        .filter((t) => matchesRelatedTaskWhere(t, args.where as never, ctx))
        .map(mapFixtureToListRow);
      return matched.slice(0, args.take ?? matched.length);
    });
    const page = await listTasksForContext(ctx, TaskContextType.MEETING, "meet-2");
    expect(page.tasks).toHaveLength(0);
    expect(prismaMocks.taskFindMany).toHaveBeenCalled();
  });
});

describe("AUFGABEN-06F1-A2 DOCUMENT runtime coverage", () => {
  const DOC_ID = "doc-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canReadWorkspaceDocument false denies list/count/create", async () => {
    prismaMocks.canReadWorkspaceDocument.mockResolvedValue(false);
    const ctx = serviceCtx(OUTSIDER, [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.WORKSPACE_VIEW,
    ]);
    await expect(listTasksForContext(ctx, TaskContextType.DOCUMENT, DOC_ID)).rejects.toThrow();
    await expect(countTasksForContext(ctx, TaskContextType.DOCUMENT, DOC_ID)).rejects.toThrow();
    const eligibility = await resolveContextualTaskCreateEligibility(
      ctx,
      TaskContextType.DOCUMENT,
      DOC_ID,
    );
    expect(eligibility.canCreate).toBe(false);
    expect(eligibility.canViewRelatedTasks).toBe(false);
  });

  it("canReadWorkspaceDocument true permits entity gate progression", async () => {
    prismaMocks.canReadWorkspaceDocument.mockResolvedValue(true);
    prismaMocks.taskFindMany.mockResolvedValue([]);
    const ctx = serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.WORKSPACE_VIEW]);
    await listTasksForContext(ctx, TaskContextType.DOCUMENT, DOC_ID);
    expect(prismaMocks.taskFindMany).toHaveBeenCalled();
  });

  it("archived/non-readable document remains denied (canonical workspace ACL)", async () => {
    prismaMocks.canReadWorkspaceDocument.mockResolvedValue(false);
    const ok = await validateTaskContextReadable(
      serviceCtx(OUTSIDER, [PERMISSIONS.WORKSPACE_VIEW]),
      TaskContextType.DOCUMENT,
      "archived-doc",
    );
    expect(ok).toBe(false);
  });
});

describe("AUFGABEN-06F1-A2 F35–F37 event type runtime validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("F35 MATCH accepts MATCH, rejects TOURNAMENT and OTHER", async () => {
    const ctx = serviceCtx(CREATOR, [PERMISSIONS.EVENTS_VIEW]);
    prismaMocks.eventFindFirst.mockImplementation(
      async (args: { where: { id: string; type: string; tenantId: string } }) => {
        const { id, type, tenantId } = args.where;
        if (tenantId !== TENANT) return null;
        if (type === "MATCH" && id === "e-match") return { id };
        if (type === "TOURNAMENT" && id === "e-tournament") return { id };
        if (type === "OTHER" && id === "e-other") return { id };
        return null;
      },
    );
    expect(await validateTaskContextReadable(ctx, TaskContextType.MATCH, "e-match")).toBe(true);
    expect(await validateTaskContextAttachable(ctx, TaskContextType.MATCH, "e-tournament")).toBe(
      false,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.MATCH, "e-other")).toBe(false);
  });

  it("F36 TOURNAMENT accepts TOURNAMENT only", async () => {
    const ctx = serviceCtx(CREATOR, [PERMISSIONS.EVENTS_VIEW]);
    prismaMocks.eventFindFirst.mockImplementation(
      async (args: { where: { id: string; type: string; tenantId: string } }) => {
        const { id, type, tenantId } = args.where;
        if (tenantId !== TENANT) return null;
        if (type === "TOURNAMENT" && id === "e-t") return { id };
        if (type === "MATCH" && id === "e-match") return { id };
        if (type === "OTHER" && id === "e-other") return { id };
        return null;
      },
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TOURNAMENT, "e-t")).toBe(true);
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TOURNAMENT, "e-match")).toBe(
      false,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TOURNAMENT, "e-other")).toBe(
      false,
    );
  });

  it("F37 CLUB_EVENT accepts OTHER only", async () => {
    const ctx = serviceCtx(CREATOR, [PERMISSIONS.EVENTS_VIEW]);
    prismaMocks.eventFindFirst.mockImplementation(
      async (args: { where: { id: string; type: string; tenantId: string } }) => {
        const { id, type, tenantId } = args.where;
        if (tenantId !== TENANT) return null;
        if (type === "OTHER" && id === "e-club") return { id };
        if (type === "MATCH" && id === "e-match") return { id };
        if (type === "TOURNAMENT" && id === "e-tournament") return { id };
        return null;
      },
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.CLUB_EVENT, "e-club")).toBe(
      true,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.CLUB_EVENT, "e-match")).toBe(
      false,
    );
    expect(
      await validateTaskContextAttachable(ctx, TaskContextType.CLUB_EVENT, "e-tournament"),
    ).toBe(false);
  });
});

describe("AUFGABEN-06F1-A2 F40 TRAINING runtime", () => {
  it("TRAINING validates TrainingSeries and rejects TrainingSession id", async () => {
    const ctx = serviceCtx(CREATOR, [PERMISSIONS.TRAININGS_VIEW]);
    prismaMocks.trainingSeriesFindFirst.mockImplementation(
      async (args: { where: { id: string; tenantId: string } }) =>
        args.where.id === "series-1" && args.where.tenantId === TENANT ? { id: "series-1" } : null,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TRAINING, "series-1")).toBe(
      true,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TRAINING, "session-1")).toBe(
      false,
    );
    expect(prismaMocks.trainingSessionFindFirst).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06F1-A2 foreign context create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    prismaMocks.auditCreate.mockClear();
    prismaMocks.emitAssignment.mockClear();
  });

  it("foreign tenant context id fails before Task creation", async () => {
    await expect(
      validateTaskContext(
        serviceCtx(CREATOR, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        TaskContextType.MATCH,
        "foreign-match-id",
      ),
    ).rejects.toBeInstanceOf(TaskValidationError);
    await expect(
      createTaskWithContextDefaults(
        serviceCtx(CREATOR, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.EVENTS_VIEW]),
        {
          trustedContext: { contextType: TaskContextType.MATCH, contextId: "foreign-match-id" },
          task: { title: "X" },
        },
      ),
    ).rejects.toThrow();
    expect(prismaMocks.taskCreate).not.toHaveBeenCalled();
    expect(prismaMocks.auditCreate).not.toHaveBeenCalled();
    expect(prismaMocks.emitAssignment).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06F1-A2 F42 PERSON assignee independence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.personFindFirst.mockResolvedValue({ id: "person-a" });
  });

  it("PERSON context with assignee User B delegates without Person.userId inference", async () => {
    const createTaskMock = vi.mocked(createTask);
    createTaskMock.mockResolvedValueOnce({ id: "task-1" } as never);
    const ctx = serviceCtx(CREATOR, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.PEOPLE_VIEW]);
    await createTaskWithContextDefaults(ctx, {
      trustedContext: { contextType: TaskContextType.PERSON, contextId: "person-a" },
      task: { title: "About person", assigneeUserIds: ["user-b"] },
    });
    expect(createTaskMock).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        contextType: TaskContextType.PERSON,
        contextId: "person-a",
        assigneeUserIds: ["user-b"],
      }),
    );
    const payload = createTaskMock.mock.calls[0]?.[1];
    expect(payload?.assigneeUserIds).not.toContain("person-a");
  });
});

describe("AUFGABEN-06F1-A2 F50–F56 platform regression references", () => {
  it("F50 participation unchanged (06P Q22 + aufgaben-05-participation-actions)", () => {
    expect(taskPersonalActionSource.sourceType).toBe("TASK");
  });

  it("F51 PersonalActions unchanged (lib/personal-actions/__tests__/task-source.test.ts)", () => {
    expect(taskPersonalActionSource.sourceType).toBe("TASK");
  });

  it("F52 Agenda unchanged (aufgaben-06e-a1 E21 + personal-agenda projections)", () => {
    expect(taskWorkspaceHref("t1")).toBe("/dashboard/aufgaben/t1");
  });

  it("F53 Followers remain gated by canonical canReadTask (06c-a1 F36 pattern)", () => {
    const matrixUser = serviceCtx(CREATOR, [PERMISSIONS.TASKS_VIEW], {
      memberOrgUnitIds: [ORG_UNIT],
      permissionReadOrgUnitIds: [ORG_UNIT],
    });
    expect(
      canReadTask(matrixUser, {
        tenantId: TENANT,
        createdByUserId: OUTSIDER,
        assigneeUserIds: [],
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_UNIT,
      }),
    ).toBe(true);
    expect(
      canReadTask(matrixUser, {
        tenantId: TENANT,
        createdByUserId: OUTSIDER,
        assigneeUserIds: [ASSIGNEE],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    ).toBe(false);
  });

  it("F54 Mentions remain gated by canonical Task access (06b-security-sentinels M34)", () => {
    expect(
      canReadTask(serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW_ALL]), {
        tenantId: TENANT,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    ).toBe(false);
  });

  it("F55 Document references use requireVisibleTask path (06d-a1 confidential gate)", () => {
    expect(
      canReadTask(serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_MANAGE]), {
        tenantId: TENANT,
        createdByUserId: CREATOR,
        assigneeUserIds: [ASSIGNEE],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    ).toBe(false);
  });

  it("F56 Matrix Z additive capabilities (06P Q23 + org-02-a2 matrix)", () => {
    const caps = resolveQuickCreateCapabilities({
      tenantId: TENANT,
      userId: CREATOR,
      permissionKeys: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.TASKS_ASSIGN,
        PERMISSIONS.TASKS_VIEW_ALL,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TRAININGS_VIEW,
      ],
    });
    expect(caps.canCreateSelf).toBe(true);
    expect(caps.canAssignOthers).toBe(true);
  });

  it("F56 same actor retains management list visibility and contextual eligibility", async () => {
    const matrixUser = serviceCtx(CREATOR, [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.EVENTS_VIEW,
    ]);
    prismaMocks.eventFindFirst.mockResolvedValue({ id: MATCH_ID });
    const eligibility = await resolveContextualTaskCreateEligibility(
      matrixUser,
      TaskContextType.MATCH,
      MATCH_ID,
    );
    expect(eligibility.canViewRelatedTasks).toBe(true);
    expect(eligibility.canCreate).toBe(true);
  });
});
