import { describe, expect, it } from "vitest";
import {
  E_FF12_ROTATION_4_TEMPLATE,
  E_FF12_ROTATION_5_TEMPLATE,
  E_FF12_ROTATION_6_TEMPLATE,
  E_FF12_ROTATION_7_TEMPLATE,
  E_FF12_ROTATION_8_TEMPLATE,
} from "../catalogue/e-ff12-rotation";
import { instantiateProgrammeTemplate } from "../instantiate-programme-template";
import { formatTemplateSideRef } from "../template-side-ref";

const CASES = [
  {
    template: E_FF12_ROTATION_4_TEMPLATE,
    fields: 3,
    rounds: 6,
    breakAfter: 3,
    small3v3Fields: 2,
    large6v6Fields: 1,
  },
  {
    template: E_FF12_ROTATION_5_TEMPLATE,
    fields: 5,
    rounds: 7,
    breakAfter: 4,
    small3v3Fields: 3,
    large6v6Fields: 2,
  },
  {
    template: E_FF12_ROTATION_6_TEMPLATE,
    fields: 6,
    rounds: 7,
    breakAfter: 4,
    small3v3Fields: 4,
    large6v6Fields: 2,
  },
  {
    template: E_FF12_ROTATION_7_TEMPLATE,
    fields: 5,
    rounds: 7,
    breakAfter: 4,
    small3v3Fields: 3,
    large6v6Fields: 2,
  },
  {
    template: E_FF12_ROTATION_8_TEMPLATE,
    fields: 6,
    rounds: 7,
    breakAfter: 4,
    small3v3Fields: 4,
    large6v6Fields: 2,
  },
] as const;

function participantsForCount(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i}`,
    displayOrder: i,
  }));
}

describe("E/FF12 rotation catalogue structure", () => {
  for (const row of CASES) {
    it(`${row.template.id} encodes field count, formats, rounds, and break`, () => {
      expect(row.template.fields).toHaveLength(row.fields);
      expect(row.template.rounds).toHaveLength(row.rounds);
      expect(row.template.breakHints).toEqual([
        expect.objectContaining({ afterRoundNumber: row.breakAfter }),
      ]);
      const small = row.template.fields.filter((f) => f.playingFormat.playersPerSide === 3);
      const large = row.template.fields.filter((f) => f.playingFormat.playersPerSide === 6);
      expect(small).toHaveLength(row.small3v3Fields);
      expect(large).toHaveLength(row.large6v6Fields);
    });

    it(`${row.template.id} instantiates fixtures for every encoded assignment`, () => {
      const plan = instantiateProgrammeTemplate({
        templateId: row.template.id,
        participants: participantsForCount(row.template.participantCount),
      });
      const encodedCount = row.template.rounds.reduce(
        (sum, r) => sum + r.assignments.length,
        0,
      );
      expect(plan.fixtures).toHaveLength(encodedCount);
      for (const fixture of plan.fixtures) {
        expect(fixture.home.participantId).toBeTruthy();
        expect(fixture.away.participantId).toBeTruthy();
        expect(formatTemplateSideRef({ slot: fixture.home.slot })).toMatch(/^[A-P]$/);
      }
    });
  }
});
