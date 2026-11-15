import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskContextType, TaskStatus } from "@prisma/client";
import {
  dedupeTasksById,
  initiativeTaskAssociationOrFilters,
  resolveCanonicalInitiativeIdForTask,
} from "@/lib/club-development/initiative-associated-tasks";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const prismaMocks = vi.hoisted(() => ({
  initiativeFindMany: vi.fn(),
  taskFindMany: vi.fn(),
  meetingAgendaItemFindMany: vi.fn(),
  meetingDecisionFindMany: vi.fn(),
}));

const progressMocks = vi.hoisted(() => ({
  computeInitiativeProgressSnapshot: vi.fn(),
}));

const visibilityMocks = vi.hoisted(() => ({
  applyVisibilityFilter: vi.fn((rows: unknown[]) => rows),
  buildVisibilityWhere: vi.fn(() => ({})),
}));

const taskCtxMocks = vi.hoisted(() => ({
  getTaskServiceContext: vi.fn(),
  buildTaskReadWhere: vi.fn(() => ({})),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    initiative: { findMany: prismaMocks.initiativeFindMany },
    task: { findMany: prismaMocks.taskFindMany },
    meetingAgendaItem: { findMany: prismaMocks.meetingAgendaItemFindMany },
    meetingDecision: { findMany: prismaMocks.meetingDecisionFindMany },
  },
}));

vi.mock("@/lib/club-development/initiative-progress", () => ({
  computeInitiativeProgressSnapshot: progressMocks.computeInitiativeProgressSnapshot,
}));

vi.mock("@/lib/visibility/visibility-filter", () => visibilityMocks);

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: taskCtxMocks.getTaskServiceContext,
}));

vi.mock("@/lib/tasks/visibility", () => ({
  buildTaskReadWhere: taskCtxMocks.buildTaskReadWhere,
}));

import { loadVorhabenWorkspace } from "@/lib/club-development/vorhaben-workspace";

function actorWith(perms: string[]): ActorContext {
  return {
    userId: "user-1",
    tenantId: "tenant-1",
    permissionKeys: perms,
    orgUnitIds: [],
    roleKeys: [],
    teamIds: [],
    personId: null,
  } as ActorContext;
}

describe("initiative-associated-tasks helpers", () => {
  it("dedupes tasks by id", () => {
    const rows = dedupeTasksById([
      { id: "a", title: "1" },
      { id: "a", title: "2" },
      { id: "b", title: "3" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("1");
  });

  it("prefers INITIATIVE context for canonical initiative id", () => {
    expect(
      resolveCanonicalInitiativeIdForTask({
        contextType: TaskContextType.INITIATIVE,
        contextId: "i1",
        primaryInitiativeId: "i2",
      }),
    ).toBe("i1");
    expect(
      resolveCanonicalInitiativeIdForTask({
        contextType: TaskContextType.MEETING,
        contextId: "m1",
        primaryInitiativeId: "i2",
      }),
    ).toBe("i2");
  });

  it("builds initiative association OR filters", () => {
    const filters = initiativeTaskAssociationOrFilters("init-1");
    expect(filters).toEqual([
      { contextType: TaskContextType.INITIATIVE, contextId: "init-1" },
      { primaryInitiativeId: "init-1" },
    ]);
  });
});

describe("loadVorhabenWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    progressMocks.computeInitiativeProgressSnapshot.mockResolvedValue({
      progress: 40,
      completedCount: 2,
      eligibleCount: 5,
      taskIds: [],
    });
    taskCtxMocks.getTaskServiceContext.mockResolvedValue({
      tenantId: "tenant-1",
      userId: "user-1",
      permissionKeys: ["tasks.view"],
      auth: {},
    });
    prismaMocks.meetingAgendaItemFindMany.mockResolvedValue([]);
    prismaMocks.meetingDecisionFindMany.mockResolvedValue([]);
  });

  it("returns restrictedReason without initiative or task permissions", async () => {
    const result = await loadVorhabenWorkspace(actorWith(["targets.view"]));
    expect(result.restrictedReason).toMatch(/Leseberechtigung/);
    expect(prismaMocks.initiativeFindMany).not.toHaveBeenCalled();
  });

  it("lists root tasks linked via INITIATIVE context or primaryInitiativeId", async () => {
    prismaMocks.initiativeFindMany.mockResolvedValue([
      { id: "init-1", slug: "alpha", title: "Alpha", status: "IN_PROGRESS" },
    ]);
    prismaMocks.taskFindMany
      .mockResolvedValueOnce([
        {
          id: "t-open",
          contextType: TaskContextType.INITIATIVE,
          contextId: "init-1",
          primaryInitiativeId: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "task-1",
          title: "Root task",
          status: TaskStatus.OPEN,
          contextType: TaskContextType.INITIATIVE,
          contextId: "init-1",
          primaryInitiativeId: null,
          dueAt: null,
          assignees: [],
        },
      ]);

    const result = await loadVorhabenWorkspace(
      actorWith([PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.TASKS_VIEW]),
    );

    expect(result.initiatives).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      id: "task-1",
      linkKind: "INITIATIVE_CONTEXT",
      isRootTask: true,
    });
    expect(prismaMocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parentTaskId: null }),
      }),
    );
  });

  it("applies taskStatus filter when provided", async () => {
    prismaMocks.initiativeFindMany.mockResolvedValue([
      { id: "init-1", slug: "alpha", title: "Alpha", status: "IN_PROGRESS" },
    ]);
    prismaMocks.taskFindMany.mockResolvedValue([]);

    await loadVorhabenWorkspace(actorWith([PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.TASKS_VIEW]), {
      taskStatus: TaskStatus.DONE,
    });

    expect(prismaMocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: TaskStatus.DONE }),
      }),
    );
  });
});