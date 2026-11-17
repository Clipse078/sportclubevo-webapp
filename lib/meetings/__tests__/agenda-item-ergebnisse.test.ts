import { describe, expect, it } from "vitest";
import { buildAgendaItemErgebnisseRows } from "@/lib/meetings/agenda-item-ergebnisse";
import { MeetingActionStatus, MeetingDecisionStatus, TaskStatus } from "@prisma/client";

describe("buildAgendaItemErgebnisseRows", () => {
  it("groups Beschluss, Pendenz and Aufgabe for one Traktandum", () => {
    const rows = buildAgendaItemErgebnisseRows({
      agendaItemId: "a1",
      meetingSlug: "sitzung-nov",
      decisions: [
        {
          id: "d1",
          title: "Budget genehmigt",
          status: MeetingDecisionStatus.CONFIRMED,
          sourceAgendaItemId: "a1",
          orderIndex: 1,
        },
      ],
      actions: [
        {
          id: "p1",
          title: "Angebot einholen",
          status: MeetingActionStatus.OPEN,
          owner: "Max Muster",
          dueDate: new Date("2026-12-01"),
          linkedRefs: { agendaItemId: "a1" },
          createdAt: new Date("2026-11-17T10:00:00Z"),
        },
      ],
      tasks: [
        {
          id: "t1",
          title: "Umsetzen",
          status: TaskStatus.OPEN,
          dueAt: null,
          assigneeLabel: "Lea",
          agendaItemId: "a1",
          decisionId: "d1",
          createdAt: new Date("2026-11-17T10:05:00Z"),
        },
      ],
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.kind)).toEqual(["BESCHLUSS", "PENDENZ", "AUFGABE"]);
    expect(rows[0]?.href).toContain("focusDecision=d1");
    expect(rows[1]?.href).toContain("focusAction=p1");
    expect(rows[2]?.href).toContain("/dashboard/aufgaben/t1");
  });

  it("ignores records linked to other Traktanden", () => {
    const rows = buildAgendaItemErgebnisseRows({
      agendaItemId: "a1",
      meetingSlug: "sitzung-nov",
      decisions: [
        {
          id: "d2",
          title: "Other",
          status: MeetingDecisionStatus.CONFIRMED,
          sourceAgendaItemId: "a2",
          orderIndex: 1,
        },
      ],
      actions: [],
      tasks: [],
    });
    expect(rows).toHaveLength(0);
  });
});