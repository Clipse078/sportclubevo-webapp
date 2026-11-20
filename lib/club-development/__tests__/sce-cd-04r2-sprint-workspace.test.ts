import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DevelopmentSprintGoalResult,
  DevelopmentSprintStatus,
  TaskStatus,
} from "@prisma/client";
import { assertSprintStatusTransition } from "../sprints/sprint-lifecycle";
import {
  classifySprintCloseTasks,
  membershipIdsToSoftRemove,
} from "../sprints/sprint-close-service";
import { parseUnfinishedDisposition, type SprintCloseSnapshot } from "../sprints/sprint-close-types";
import {
  filterSprintBoardCards,
  groupBoardCardsByInitiative,
  isTaskOverdue,
} from "../sprints/sprint-board-filters";
import { buildSprintReviewViewModel, parseCloseSnapshot } from "../sprints/sprint-review";
import { filterCloseSnapshotForAuthorization } from "../sprints/sprint-review-snapshot-auth";
import type { SprintBoardCard } from "../sprints/sprint-board";

const prismaMocks = vi.hoisted(() => ({
  developmentSprintFindFirst: vi.fn(),
  developmentSprintUpdate: vi.fn(),
  developmentSprintTaskMembershipUpdateMany: vi.fn(),
  developmentSprintTaskMembershipFindMany: vi.fn(),
  taskFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    developmentSprint: {
      findFirst: prismaMocks.developmentSprintFindFirst,
      update: prismaMocks.developmentSprintUpdate,
    },
    developmentSprintTaskMembership: {
      updateMany: prismaMocks.developmentSprintTaskMembershipUpdateMany,
      findMany: prismaMocks.developmentSprintTaskMembershipFindMany,
    },
    task: { findMany: prismaMocks.taskFindMany },
    $transaction: prismaMocks.transaction,
  },
}));

function card(partial: Partial<SprintBoardCard> & { taskId: string }): SprintBoardCard {
  return {
    taskId: partial.taskId,
    title: partial.title ?? partial.taskId,
    status: partial.status ?? TaskStatus.OPEN,
    column: partial.column ?? "OPEN",
    priority: partial.priority ?? "NORMAL",
    dueAt: partial.dueAt ?? null,
    assignees: partial.assignees ?? [],
    initiativeLabel: partial.initiativeLabel ?? null,
    initiativeId: partial.initiativeId ?? null,
    targetId: partial.targetId ?? null,
    targetTitle: partial.targetTitle ?? null,
    strategyId: partial.strategyId ?? null,
    strategyTitle: partial.strategyTitle ?? null,
    orgUnitLabel: partial.orgUnitLabel ?? null,
    taskHref: partial.taskHref ?? `/aufgaben/${partial.taskId}`,
    addedAfterSprintStart: partial.addedAfterSprintStart ?? false,
  };
}

describe("SCE-CD-04R2 sprint workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid sprint lifecycle transitions", () => {
    expect(() => assertSprintStatusTransition(DevelopmentSprintStatus.PLANNED, DevelopmentSprintStatus.COMPLETED)).toThrow();
    expect(() => assertSprintStatusTransition(DevelopmentSprintStatus.COMPLETED, DevelopmentSprintStatus.ACTIVE)).toThrow();
    expect(() => assertSprintStatusTransition(DevelopmentSprintStatus.PLANNED, DevelopmentSprintStatus.ACTIVE)).not.toThrow();
  });

  it("maps legacy KEEP/REMOVE close dispositions to product semantics", () => {
    expect(parseUnfinishedDisposition("KEEP")).toBe("RETAIN_HISTORICAL");
    expect(parseUnfinishedDisposition("REMOVE")).toBe("BACKLOG");
    expect(parseUnfinishedDisposition("FUTURE_SPRINT")).toBe("FUTURE_SPRINT");
  });

  it("filters sprint board cards without leaking restricted counts in messages", () => {
    const rows = [
      card({ taskId: "a", title: "Alpha", initiativeId: "i1", initiativeLabel: "Vorhaben A", assignees: [{ userId: "u1", displayName: "Ada" }] }),
      card({ taskId: "b", title: "Beta", initiativeId: null, initiativeLabel: null }),
    ];
  const mine = filterSprintBoardCards(rows, { search: "", mineOnly: true, assigneeUserId: null, initiativeId: null, groupByInitiative: false }, "u1");
    expect(mine.map((r) => r.taskId)).toEqual(["a"]);

    const grouped = groupBoardCardsByInitiative(rows);
    expect(grouped.some((g) => g.label === "Ohne Vorhaben")).toBe(true);
  });

  it("marks overdue due dates", () => {
    expect(isTaskOverdue(new Date(Date.now() - 86_400_000).toISOString())).toBe(true);
    expect(isTaskOverdue(null)).toBe(false);
  });

  it("builds review from immutable close snapshot after later task changes", () => {
    const snapshot: SprintCloseSnapshot = {
      version: 1,
      closedAt: "2026-11-14T12:00:00.000Z",
      goalResult: DevelopmentSprintGoalResult.ACHIEVED,
      reviewNotes: "Gut gelaufen",
      finishedTasks: [{ taskId: "t1", title: "Done task", statusAtClose: TaskStatus.DONE, finished: true }],
      unfinishedTasks: [
        {
          taskId: "t2",
          title: "Open task",
          statusAtClose: TaskStatus.OPEN,
          finished: false,
          disposition: "BACKLOG",
        },
      ],
      committedAtStartTaskIds: ["t1"],
      addedAfterStartTaskIds: ["t2"],
      defaultUnfinishedDisposition: "BACKLOG",
    };

    expect(parseCloseSnapshot(snapshot)?.finishedTasks).toHaveLength(1);

    const review = buildSprintReviewViewModel({
      goal: "Ship sprint workflow",
      goalResult: DevelopmentSprintGoalResult.PARTLY_ACHIEVED,
      reviewNotes: "stale",
      startedAt: new Date("2026-11-01"),
      completedAt: new Date("2026-11-14"),
      closeSnapshot: snapshot,
    });
    expect(review.fromSnapshot).toBe(true);
    expect(review.goalResult).toBe(DevelopmentSprintGoalResult.ACHIEVED);
    expect(review.finishedAtClose[0].statusAtClose).toBe(TaskStatus.DONE);
    expect(review.addedAfterStartCount).toBe(1);
  });

  it("keeps legacy REMOVE helper behaviour for unfinished membership soft-remove", () => {
    expect(membershipIdsToSoftRemove(["a", "b"], "REMOVE")).toEqual(["a", "b"]);
    expect(classifySprintCloseTasks([{ taskId: "x", status: TaskStatus.DONE }]).finished).toHaveLength(1);
  });

  it("filters historical close snapshot task rows by current authorization without mutating stored ids in DB", () => {
    const snapshot: SprintCloseSnapshot = {
      version: 1,
      closedAt: "2026-11-14T12:00:00.000Z",
      goalResult: DevelopmentSprintGoalResult.ACHIEVED,
      reviewNotes: null,
      finishedTasks: [{ taskId: "visible", title: "Visible", statusAtClose: TaskStatus.DONE, finished: true }],
      unfinishedTasks: [
        {
          taskId: "hidden",
          title: "Secret",
          statusAtClose: TaskStatus.OPEN,
          finished: false,
          disposition: "BACKLOG",
        },
      ],
      committedAtStartTaskIds: ["visible", "hidden"],
      addedAfterStartTaskIds: ["hidden"],
      defaultUnfinishedDisposition: "BACKLOG",
    };

    const filtered = filterCloseSnapshotForAuthorization(snapshot, new Set(["visible"]));
    expect(filtered.finishedTasks.map((t) => t.taskId)).toEqual(["visible"]);
    expect(filtered.unfinishedTasks).toHaveLength(0);
    expect(filtered.addedAfterStartTaskIds).toHaveLength(0);
    expect(snapshot.unfinishedTasks).toHaveLength(1);

    const review = buildSprintReviewViewModel({
      goal: "G",
      goalResult: null,
      reviewNotes: null,
      startedAt: null,
      completedAt: null,
      closeSnapshot: snapshot,
      authorizedTaskIds: new Set(["visible"]),
    });
    expect(review.addedAfterStartCount).toBe(0);
    expect(review.finishedAtClose).toHaveLength(1);
    expect(review.unfinishedAtClose).toHaveLength(0);
  });
});