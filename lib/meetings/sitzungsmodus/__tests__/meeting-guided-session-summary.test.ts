import { describe, expect, it } from "vitest";
import { buildGuidedSitzungsmodusSessionSummary } from "@/lib/meetings/sitzungsmodus/meeting-guided-session-summary";

describe("buildGuidedSitzungsmodusSessionSummary", () => {
  it("lists open agenda topics and incomplete actions", () => {
    const summary = buildGuidedSitzungsmodusSessionSummary({
      agendaItems: [
        { id: "a1", title: "Finanzen", status: "OPEN", position: 1 },
        { id: "a2", title: "Sport", status: "DISCUSSED", position: 2 },
      ],
      actions: [
        { id: "x1", title: "Angebot einholen", status: "OPEN" },
        { id: "x2", title: "Erledigt", status: "DONE" },
      ],
    });
    expect(summary.hasGaps).toBe(true);
    expect(summary.openTopics).toHaveLength(1);
    expect(summary.openTopics[0]?.title).toBe("Finanzen");
    expect(summary.incompleteActions).toHaveLength(1);
    expect(summary.incompleteActions[0]?.title).toBe("Angebot einholen");
  });

  it("reports no gaps when all topics are closed and actions done", () => {
    const summary = buildGuidedSitzungsmodusSessionSummary({
      agendaItems: [{ id: "a1", title: "Finanzen", status: "DISCUSSED", position: 1 }],
      actions: [{ id: "x1", title: "Erledigt", status: "DONE" }],
    });
    expect(summary.hasGaps).toBe(false);
  });
});