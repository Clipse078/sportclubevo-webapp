import { describe, expect, it } from "vitest";
import { comparePersonalActions, sortPersonalActions } from "../ordering";
import type { PersonalAction } from "../types";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function taskAction(overrides: Partial<PersonalAction> & Pick<PersonalAction, "id">): PersonalAction {
  return {
    sourceType: "TASK",
    sourceId: overrides.id.replace("task:", ""),
    title: "Task",
    dueAt: null,
    status: "ACTIONABLE",
    href: null,
    actionKind: "TASK",
    createdAt: "2026-09-01T00:00:00.000Z",
    priority: "NORMAL",
    ...overrides,
  };
}

function attendanceAction(
  overrides: Partial<PersonalAction> & Pick<PersonalAction, "id">,
): PersonalAction {
  return {
    sourceType: "ATTENDANCE_RESPONSE",
    sourceId: null,
    title: "Spiel",
    dueAt: null,
    status: "ACTIONABLE",
    href: null,
    actionKind: "PARTICIPATION_RESPONSE",
    context: { eventStartAt: "2026-09-25T18:00:00.000Z" },
    ...overrides,
  };
}

describe("AUFGABEN-05 — PersonalAction ordering", () => {
  it("T — overdue task before attendance without deadline", () => {
    const overdue = taskAction({
      id: "task:1",
      dueAt: "2026-09-18T00:00:00.000Z",
    });
    const attendance = attendanceAction({ id: "participation:p1:MATCH:e1" });
    expect(comparePersonalActions(overdue, attendance, NOW)).toBeLessThan(0);
  });

  it("T — attendance ordered by upcoming event start when no dueAt", () => {
    const early = attendanceAction({
      id: "participation:p1:TRAINING:s1",
      context: { eventStartAt: "2026-09-21T10:00:00.000Z" },
    });
    const late = attendanceAction({
      id: "participation:p1:MATCH:e1",
      context: { eventStartAt: "2026-09-30T10:00:00.000Z" },
    });
    const sorted = sortPersonalActions([late, early], NOW);
    expect(sorted.map((a) => a.id)).toEqual([early.id, late.id]);
  });

  it("tie-break — stable identity via id", () => {
    const a = attendanceAction({
      id: "participation:aa:TRAINING:s1",
      context: { eventStartAt: "2026-09-25T10:00:00.000Z" },
    });
    const b = attendanceAction({
      id: "participation:bb:TRAINING:s1",
      context: { eventStartAt: "2026-09-25T10:00:00.000Z" },
    });
    expect(comparePersonalActions(a, b, NOW)).toBeLessThan(0);
  });
});
