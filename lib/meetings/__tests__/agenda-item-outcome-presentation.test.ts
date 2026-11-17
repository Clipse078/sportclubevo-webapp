import { describe, expect, it } from "vitest";
import { buildAgendaItemOutcomeLinkLabels } from "@/lib/meetings/agenda-item-outcome-presentation";

describe("buildAgendaItemOutcomeLinkLabels", () => {
  it("counts linked Beschlüsse and Pendenzen for collapsed metadata", () => {
    const labels = buildAgendaItemOutcomeLinkLabels(
      "a1",
      [
        { sourceAgendaItemId: "a1" },
        { sourceAgendaItemId: "a2" },
      ],
      [
        { linkedRefs: { agendaItemId: "a1" } },
        { linkedRefs: { agendaItemId: "a1" } },
      ],
    );
    expect(labels).toEqual(["1 Beschluss", "2 Pendenzen"]);
  });
});