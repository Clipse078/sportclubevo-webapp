import { describe, expect, it } from "vitest";
import {
  assertMeetingTaskIdempotencyPayloadMatches,
  meetingTaskIdempotencyPayloadMatches,
} from "@/lib/meetings/meeting-task-create-idempotency";
import { TaskValidationError } from "@/lib/tasks/errors";

describe("meetingTaskIdempotencyPayloadMatches", () => {
  it("matches normalized payload fields", () => {
    const existing = {
      title: "Title",
      description: "  note  ",
      dueAt: new Date("2026-03-01T12:00:00.000Z"),
      priority: "HIGH" as const,
      orgUnitId: "org-1",
      assignees: [{ userId: "u2" }, { userId: "u1" }],
    };
    expect(
      meetingTaskIdempotencyPayloadMatches(
        {
          title: " Title ",
          description: "note",
          dueAt: new Date("2026-03-01T12:00:00.000Z"),
          priority: "HIGH",
          orgUnitId: "org-1",
          assigneeUserIds: ["u1", "u2"],
        },
        existing,
      ),
    ).toBe(true);
  });

  it("throws on payload mismatch", () => {
    expect(() =>
      assertMeetingTaskIdempotencyPayloadMatches(
        { title: "A" },
        {
          title: "B",
          description: null,
          dueAt: null,
          priority: "NORMAL",
          orgUnitId: null,
          assignees: [],
        },
      ),
    ).toThrow(TaskValidationError);
  });
});