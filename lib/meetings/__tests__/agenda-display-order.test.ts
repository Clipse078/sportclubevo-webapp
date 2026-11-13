import { describe, expect, it } from "vitest";
import { buildMeetingProtocolDocument } from "@/lib/meetings/meeting-protocol-document";
import {
  buildCanonicalAgendaDisplayOrderMap,
  formatAgendaHeading,
} from "@/lib/meetings/agenda-display-order";
import { completedMeetingProtocolFixture } from "@/lib/meetings/__tests__/fixtures/meeting-protocol-fixtures";

describe("agenda display order", () => {
  it("assigns sequential numbers from sorted position regardless of sparse orderIndex", () => {
    const map = buildCanonicalAgendaDisplayOrderMap([
      { id: "a", orderIndex: 5 },
      { id: "b", orderIndex: 12 },
      { id: "c", orderIndex: 0 },
    ]);
    expect(map.get("a")).toBe(1);
    expect(map.get("b")).toBe(2);
    expect(map.get("c")).toBe(3);
  });

  it("formats headings without duplicate list markup", () => {
    expect(formatAgendaHeading(3, "Budget")).toBe("3. Budget");
  });

  it("aligns protocol overview numbers with detail blocks", () => {
    const model = buildMeetingProtocolDocument(completedMeetingProtocolFixture);
    expect(model.agendaOverview.map((i) => i.orderNumber)).toEqual(
      model.agendaItems.map((i) => i.orderNumber),
    );
    expect(model.agendaOverview[0]?.orderNumber).toBe(1);
  });
});
