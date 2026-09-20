import { describe, expect, it } from "vitest";
import {
  buildTaskAssignedDedupKey,
  buildTaskDueSoonDedupKey,
  buildTaskOverdueDedupKey,
} from "../deduplication";

describe("notification deduplication keys", () => {
  it("builds deterministic task assignment keys", () => {
    expect(
      buildTaskAssignedDedupKey({
        taskId: "task-1",
        recipientUserId: "user-1",
        assignedAtMs: 1000,
      }),
    ).toBe("TASK_ASSIGNED:task-1:user-1:1000");
  });

  it("scopes assignment keys per recipient so assignees do not suppress each other", () => {
    const assignedAtMs = 1000;
    const keyA = buildTaskAssignedDedupKey({
      taskId: "task-1",
      recipientUserId: "user-a",
      assignedAtMs,
    });
    const keyB = buildTaskAssignedDedupKey({
      taskId: "task-1",
      recipientUserId: "user-b",
      assignedAtMs,
    });
    expect(keyA).not.toBe(keyB);
  });

  it("includes dueAt in due-soon and overdue keys", () => {
    const dueAtIso = "2026-09-21T12:00:00.000Z";
    expect(
      buildTaskDueSoonDedupKey({
        taskId: "task-1",
        recipientUserId: "user-1",
        dueAtIso,
      }),
    ).toBe(`TASK_DUE_SOON:task-1:user-1:${dueAtIso}`);
    expect(
      buildTaskOverdueDedupKey({
        taskId: "task-1",
        recipientUserId: "user-1",
        dueAtIso,
      }),
    ).toBe(`TASK_OVERDUE:task-1:user-1:${dueAtIso}`);
  });
});
