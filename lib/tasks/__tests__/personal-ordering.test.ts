import { describe, it, expect } from "vitest";
import { TaskStatus } from "@prisma/client";
import { comparePersonalTasks, getPersonalTaskUrgencyBucket } from "../personal-ordering";

describe("AUFGABEN-01B personal task ordering", () => {
  const now = new Date("2026-09-20T10:00:00.000Z");

  it("orders overdue before due today before upcoming before no deadline", () => {
    const overdue = {
      id: "1",
      dueAt: "2026-09-18T12:00:00.000Z",
      status: TaskStatus.OPEN,
      createdAt: "2026-09-01T00:00:00.000Z",
      priority: "NORMAL",
    };
    const today = {
      id: "2",
      dueAt: "2026-09-20T15:00:00.000Z",
      status: TaskStatus.OPEN,
      createdAt: "2026-09-01T00:00:00.000Z",
      priority: "NORMAL",
    };
    const none = {
      id: "3",
      dueAt: null,
      status: TaskStatus.OPEN,
      createdAt: "2026-09-01T00:00:00.000Z",
      priority: "NORMAL",
    };

    expect(getPersonalTaskUrgencyBucket(overdue, now)).toBe(0);
    expect(getPersonalTaskUrgencyBucket(today, now)).toBe(1);
    expect(getPersonalTaskUrgencyBucket(none, now)).toBe(4);
    expect(comparePersonalTasks(overdue, today, now)).toBeLessThan(0);
    expect(comparePersonalTasks(today, none, now)).toBeLessThan(0);
  });

  it("does not treat DONE tasks as overdue buckets when filtered upstream", () => {
    const done = {
      id: "d",
      dueAt: "2026-09-01T00:00:00.000Z",
      status: TaskStatus.DONE,
      createdAt: "2026-09-01T00:00:00.000Z",
      priority: "NORMAL",
    };
    expect(getPersonalTaskUrgencyBucket(done, now)).toBe(3);
  });
});
