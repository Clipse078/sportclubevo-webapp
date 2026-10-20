import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_6_TEMPLATE } from "../catalogue/e-ff12-rotation";
import { instantiateProgrammeTemplate } from "../instantiate-programme-template";
import { formatTemplateSideRef } from "../template-side-ref";

function assignmentKey(roundNumber: number, fieldOrder: number, home: string, away: string) {
  return `${roundNumber}|${fieldOrder}|${home}|${away}`;
}

function templateAssignmentKeys(template = E_FF12_ROTATION_6_TEMPLATE): Set<string> {
  const keys = new Set<string>();
  for (const round of template.rounds) {
    for (const row of round.assignments) {
      const field = template.fields.find((f) => f.fieldKey === row.fieldKey);
      keys.add(
        assignmentKey(
          round.roundNumber,
          field?.displayOrder ?? -1,
          formatTemplateSideRef(row.home),
          formatTemplateSideRef(row.away),
        ),
      );
    }
  }
  return keys;
}

describe("E/FF12 6-team rotation reference", () => {
  const participants = [
    { id: "p-a", displayOrder: 0 },
    { id: "p-b", displayOrder: 1 },
    { id: "p-c", displayOrder: 2 },
    { id: "p-d", displayOrder: 3 },
    { id: "p-e", displayOrder: 4 },
    { id: "p-f", displayOrder: 5 },
  ];

  it("matches approved round 1 field assignments", () => {
    const keys = templateAssignmentKeys();
    expect(keys.has(assignmentKey(1, 1, "F1", "A1"))).toBe(true);
    expect(keys.has(assignmentKey(1, 4, "F2", "A2"))).toBe(true);
    expect(keys.has(assignmentKey(1, 5, "B", "E"))).toBe(true);
    expect(keys.has(assignmentKey(1, 6, "C", "D"))).toBe(true);
  });

  it("uses 6 fields with 3v3 on 1–4 and 6v6 on 5–6", () => {
    expect(E_FF12_ROTATION_6_TEMPLATE.fields).toHaveLength(6);
    expect(E_FF12_ROTATION_6_TEMPLATE.fields.slice(0, 4).every((f) => f.playingFormat.playersPerSide === 3)).toBe(true);
    expect(E_FF12_ROTATION_6_TEMPLATE.fields.slice(4).every((f) => f.playingFormat.playersPerSide === 6)).toBe(true);
  });

  it("defines pause after round 4 and 7 rounds", () => {
    expect(E_FF12_ROTATION_6_TEMPLATE.rounds).toHaveLength(7);
    expect(E_FF12_ROTATION_6_TEMPLATE.breakHints).toEqual([
      expect.objectContaining({ afterRoundNumber: 4 }),
    ]);
  });

  it("maps participants deterministically to slots A–F", () => {
    const plan = instantiateProgrammeTemplate({
      templateId: E_FF12_ROTATION_6_TEMPLATE.id,
      participants,
    });
    expect(plan.slotMapping.A).toBe("p-a");
    expect(plan.slotMapping.F).toBe("p-f");
    const again = instantiateProgrammeTemplate({
      templateId: E_FF12_ROTATION_6_TEMPLATE.id,
      participants,
    });
    expect(again.slotMapping).toEqual(plan.slotMapping);
  });
});
