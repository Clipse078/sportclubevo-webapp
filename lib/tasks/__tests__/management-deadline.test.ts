import { describe, expect, it } from "vitest";
import { presentTaskDeadline, startOfLocalDay } from "../management-deadline";

describe("task management deadline presentation", () => {
  const timeZone = "Europe/Zurich";

  it("marks overdue active tasks", () => {
    const now = new Date("2026-09-20T10:00:00.000Z");
    const result = presentTaskDeadline({
      dueAt: "2026-09-18T12:00:00.000Z",
      status: "OPEN",
      now,
      timeZone,
    });
    expect(result.kind).toBe("OVERDUE");
    expect(result.emphasis).toBe("urgent");
  });

  it("returns calm empty presentation without due date", () => {
    const result = presentTaskDeadline({
      dueAt: null,
      status: "OPEN",
      timeZone,
    });
    expect(result.kind).toBe("NONE");
    expect(result.label).toBe("");
  });

  it("does not mark completed tasks overdue", () => {
    const now = new Date("2026-09-20T10:00:00.000Z");
    const result = presentTaskDeadline({
      dueAt: "2026-09-18T12:00:00.000Z",
      status: "DONE",
      now,
      timeZone,
    });
    expect(result.kind).toBe("NONE");
  });

  it("computes start of local day", () => {
    const day = startOfLocalDay(new Date("2026-09-20T10:00:00.000Z"), timeZone);
    expect(Number.isNaN(day.getTime())).toBe(false);
    expect(day.getUTCHours()).toBe(0);
  });
});
