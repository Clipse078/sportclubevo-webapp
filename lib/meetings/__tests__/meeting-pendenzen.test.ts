import { describe, expect, it } from "vitest";
import {
  countOpenPendenzen,
  countOverduePendenzen,
  dedupePendenzKeys,
  filterPendenzen,
  mergeMeetingPendenzen,
} from "@/lib/meetings/meeting-pendenzen";
import { MeetingActionStatus, TaskStatus } from "@prisma/client";

const meeting = {
  id: "m1",
  title: "Sitzung A",
  slug: "sitzung-a",
  meetingDate: new Date("2026-06-01T18:00:00Z"),
};

describe("meeting-pendenzen", () => {
  it("dedupes by source id keys", () => {
    const rows = mergeMeetingPendenzen({
      meeting,
      actions: [
        {
          id: "a1",
          title: "Massnahme 1",
          description: null,
          expectedOutcome: null,
          owner: "Max",
          dueDate: null,
          status: MeetingActionStatus.OPEN,
          statusLabel: "Offen",
        },
      ],
      tasks: [
        {
          id: "t1",
          title: "Aufgabe 1",
          description: null,
          dueAt: null,
          status: TaskStatus.OPEN,
          statusLabel: "Offen",
          assigneeLabels: ["Lea"],
          contextReference: null,
        },
      ],
    });
    expect(dedupePendenzKeys(rows).sort()).toEqual(["aufgabe:t1", "massnahme:a1"]);
    expect(countOpenPendenzen(rows)).toBe(2);
  });

  it("marks overdue from deadline and non-terminal status", () => {
    const rows = mergeMeetingPendenzen({
      meeting,
      now: new Date("2026-07-01"),
      actions: [
        {
          id: "a2",
          title: "Spät",
          description: null,
          expectedOutcome: null,
          owner: null,
          dueDate: new Date("2026-06-15"),
          status: MeetingActionStatus.OPEN,
          statusLabel: "Offen",
        },
      ],
      tasks: [],
    });
    expect(rows[0]?.isOverdue).toBe(true);
    expect(filterPendenzen(rows, "open")).toHaveLength(1);
    expect(countOverduePendenzen(rows)).toBe(1);
  });

  it("excludes terminal statuses from open filter", () => {
    const rows = mergeMeetingPendenzen({
      meeting,
      actions: [
        {
          id: "a3",
          title: "Erledigt",
          description: null,
          expectedOutcome: null,
          owner: null,
          dueDate: null,
          status: MeetingActionStatus.DONE,
          statusLabel: "Erledigt",
        },
      ],
      tasks: [],
    });
    expect(filterPendenzen(rows, "open")).toHaveLength(0);
    expect(filterPendenzen(rows, "all")).toHaveLength(1);
  });
});
