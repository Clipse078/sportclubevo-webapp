import { describe, expect, it, vi, beforeEach } from "vitest";
import { DevelopmentSprintStatus, TaskContextType, TaskStatus } from "@prisma/client";
import {
  dedupeTasksById,
  initiativeTaskAssociationOrFilters,
  resolveCanonicalInitiativeIdForTask,
} from "../initiative-associated-tasks";
import {
  initiativeGroupSelectionState,
  toggleInitiativeGroupSelection,
} from "../sprints/sprint-bulk-planning-selection";
import {
  isSprintPlanningEligibleStatus,
  isSprintPlanningTaskSelectable,
  sprintPlanningExclusionMessage,
} from "../sprints/sprint-planning-eligibility";
import { bulkAddTasksToSprint, addTaskToSprint } from "../sprints/sprint-service";

const prismaMocks = vi.hoisted(() => ({
  developmentSprintFindFirst: vi.fn(),
  developmentSprintTaskMembershipFindFirst: vi.fn(),
  developmentSprintTaskMembershipCreate: vi.fn(),
  developmentSprintTaskMembershipUpdate: vi.fn(),
  transaction: vi.fn(),
  taskFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    developmentSprint: { findFirst: prismaMocks.developmentSprintFindFirst },
    developmentSprintTaskMembership: {
      findFirst: prismaMocks.developmentSprintTaskMembershipFindFirst,
      create: prismaMocks.developmentSprintTaskMembershipCreate,
      update: prismaMocks.developmentSprintTaskMembershipUpdate,
    },
    task: { findFirst: prismaMocks.taskFindFirst },
    $transaction: (fn: (tx: unknown) => Promise<void>) => prismaMocks.transaction(fn),
  },
}));

describe("SCE-CD-04 bulk sprint planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.transaction.mockImplementation(async (fn) => fn(prismaMocks));
  });

  it("dedupes initiative association filters by task id", () => {
    const rows = [
      { id: "a", contextType: TaskContextType.INITIATIVE, contextId: "i1", primaryInitiativeId: null },
      { id: "a", contextType: TaskContextType.MATCH, contextId: "m1", primaryInitiativeId: "i1" },
      { id: "b", contextType: TaskContextType.INITIATIVE, contextId: "i1", primaryInitiativeId: null },
    ];
    expect(dedupeTasksById(rows).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("prefers INITIATIVE context over primaryInitiativeId for grouping", () => {
    expect(
      resolveCanonicalInitiativeIdForTask({
        contextType: TaskContextType.INITIATIVE,
        contextId: "ctx-init",
        primaryInitiativeId: "primary-init",
      }),
    ).toBe("ctx-init");
    expect(
      resolveCanonicalInitiativeIdForTask({
        contextType: TaskContextType.MATCH,
        contextId: "match-1",
        primaryInitiativeId: "primary-init",
      }),
    ).toBe("primary-init");
  });

  it("builds canonical initiative OR filters", () => {
    const filters = initiativeTaskAssociationOrFilters("init-1");
    expect(filters).toHaveLength(2);
    expect(filters[0]).toEqual({
      contextType: TaskContextType.INITIATIVE,
      contextId: "init-1",
    });
    expect(filters[1]).toEqual({ primaryInitiativeId: "init-1" });
  });

  it("toggles partial initiative group selection to all", () => {
    const tasks = [
      { id: "t1", selectable: true },
      { id: "t2", selectable: true },
      { id: "t3", selectable: false },
    ];
    expect(initiativeGroupSelectionState(tasks, new Set(["t1"]))).toBe("partial");
    const next = toggleInitiativeGroupSelection(tasks, new Set(["t1"]));
    expect(initiativeGroupSelectionState(tasks, next)).toBe("all");
  });

  it("clears all when initiative group already fully selected", () => {
    const tasks = [
      { id: "t1", selectable: true },
      { id: "t2", selectable: true },
    ];
    const next = toggleInitiativeGroupSelection(tasks, new Set(["t1", "t2"]));
    expect(next.size).toBe(0);
  });

  it("marks terminal tasks ineligible", () => {
    expect(isSprintPlanningEligibleStatus(TaskStatus.DONE)).toBe(false);
    expect(isSprintPlanningEligibleStatus(TaskStatus.OPEN)).toBe(true);
    expect(
      isSprintPlanningTaskSelectable({
        inTargetSprint: false,
        otherSprintTitle: null,
        status: TaskStatus.DONE,
      }),
    ).toBe(false);
  });

  it("explains other-sprint exclusion without exposing restricted rows", () => {
    const message = sprintPlanningExclusionMessage({
      inTargetSprint: false,
      otherSprintTitle: "Sprint Q4",
      status: TaskStatus.OPEN,
    });
    expect(message).toContain("Sprint Q4");
    expect(message).toContain("nicht automatisch verschoben");
  });

  it("rejects add when task is active in another sprint", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-a",
      status: DevelopmentSprintStatus.PLANNED,
    });
    prismaMocks.taskFindFirst.mockResolvedValue({
      id: "task-1",
      contextType: TaskContextType.INITIATIVE,
      contextId: "init-1",
    });
    prismaMocks.developmentSprintTaskMembershipFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "mem-other", sprint: { title: "Sprint B" } });

    await expect(addTaskToSprint("tenant-1", "sprint-a", "task-1")).rejects.toThrow(
      "nicht automatisch verschoben",
    );
    expect(prismaMocks.developmentSprintTaskMembershipCreate).not.toHaveBeenCalled();
  });

  it("bulk add dedupes ids and reports partial success", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-1",
      status: DevelopmentSprintStatus.PLANNED,
    });
    prismaMocks.developmentSprintTaskMembershipFindFirst.mockResolvedValue(null);
    prismaMocks.developmentSprintTaskMembershipCreate.mockResolvedValue({ id: "mem" });

    const result = await bulkAddTasksToSprint("tenant-1", "sprint-1", ["t1", "t1", "t2"], async (taskId) => {
      if (taskId === "t2") {
        return { ok: false, code: "FORBIDDEN" };
      }
      return { ok: true, status: TaskStatus.OPEN };
    });

    expect(result.addedCount).toBe(1);
    expect(result.partial).toBe(true);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].code).toBe("FORBIDDEN");
    expect(prismaMocks.developmentSprintTaskMembershipCreate).toHaveBeenCalledTimes(1);
  });

  it("bulk add rejects ineligible status at submit time", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-1",
      status: DevelopmentSprintStatus.PLANNED,
    });

    const result = await bulkAddTasksToSprint("tenant-1", "sprint-1", ["done-task"], async () => ({
      ok: true,
      status: TaskStatus.DONE,
    }));

    expect(result.addedCount).toBe(0);
    expect(result.rejected[0]?.code).toBe("INELIGIBLE");
  });

  it("preserves selection semantics: unchanged task fields on membership insert", async () => {
    prismaMocks.developmentSprintFindFirst.mockResolvedValue({
      id: "sprint-1",
      status: DevelopmentSprintStatus.ACTIVE,
    });
    prismaMocks.developmentSprintTaskMembershipFindFirst.mockResolvedValue(null);
    prismaMocks.developmentSprintTaskMembershipCreate.mockResolvedValue({ id: "mem-1" });
    prismaMocks.taskFindFirst.mockResolvedValue({
      id: "task-ctx",
      contextType: TaskContextType.INITIATIVE,
      contextId: "init-99",
    });

    await addTaskToSprint("tenant-1", "sprint-1", "task-ctx");
    expect(prismaMocks.taskFindFirst).toHaveBeenCalled();
    expect(prismaMocks.developmentSprintTaskMembershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "task-ctx",
          addedAfterSprintStart: true,
        }),
      }),
    );
  });
});