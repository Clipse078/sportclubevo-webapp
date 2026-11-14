import { describe, expect, it } from "vitest";
import { DevelopmentSprintGoalResult, TaskStatus, TaskVisibilityScope } from "@prisma/client";
import { filterSprintCloseClientReport } from "../sprints/sprint-task-visibility";
import type { SprintCloseSnapshot } from "../sprints/sprint-close-types";
import { EMPTY_TASK_AUTH_SCOPE, buildTaskReadWhere } from "@/lib/tasks/task-authorization";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("SCE-CD-04R2 sprint task visibility", () => {

  it("filters close client report counts and snapshot rows without dropping stored snapshot fields from input", () => {
    const snapshot: SprintCloseSnapshot = {
      version: 1,
      closedAt: "2026-11-14T12:00:00.000Z",
      goalResult: DevelopmentSprintGoalResult.ACHIEVED,
      reviewNotes: null,
      finishedTasks: [
        { taskId: "visible", title: "V", statusAtClose: TaskStatus.DONE, finished: true },
        { taskId: "hidden", title: "H", statusAtClose: TaskStatus.DONE, finished: true },
      ],
      unfinishedTasks: [],
      committedAtStartTaskIds: ["visible", "hidden"],
      addedAfterStartTaskIds: ["hidden"],
      defaultUnfinishedDisposition: "BACKLOG",
    };
    const filtered = filterSprintCloseClientReport(
      {
        finishedCount: 2,
        unfinishedCount: 0,
        goalResult: DevelopmentSprintGoalResult.ACHIEVED,
        idempotent: false,
        snapshot,
      },
      new Set(["visible"]),
    );
    expect(filtered.finishedCount).toBe(1);
    expect(filtered.snapshot?.finishedTasks).toHaveLength(1);
    expect(filtered.snapshot?.committedAtStartTaskIds).toEqual(["visible"]);
    expect(snapshot.finishedTasks).toHaveLength(2);
  });

  it("buildTaskReadWhere is non-empty for tasks.view-only actor (confidential tasks filtered in SQL)", () => {
    const outsider: TaskServiceContext = {
      tenantId: "tenant-1",
      userId: "outsider",
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    const where = buildTaskReadWhere(outsider);
    expect(Object.keys(where).length).toBeGreaterThan(0);
    expect(JSON.stringify(where)).toContain(TaskVisibilityScope.ASSIGNEES_ONLY);
  });
});