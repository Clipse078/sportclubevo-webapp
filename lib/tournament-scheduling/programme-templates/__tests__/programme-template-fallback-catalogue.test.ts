import { describe, expect, it } from "vitest";
import { buildPlanungProgrammeTemplatePresentation } from "../planung-template-presentation";
import { listProgrammeTemplates } from "../template-registry";

describe("programme template catalogue fallback (02D R1)", () => {
  it("curated counts remain 4–8 only", () => {
    const counts = [...new Set(listProgrammeTemplates().map((t) => t.participantCount))].sort(
      (a, b) => a - b,
    );
    expect(counts).toEqual([4, 5, 6, 7, 8]);
  });

  it("counts 9–16 require TP01 fallback (no fabricated curated template)", () => {
    for (let count = 9; count <= 16; count += 1) {
      const presentation = buildPlanungProgrammeTemplatePresentation({
        participantCount: count,
        categoryContext: "E_FF12",
      });
      expect(presentation.available).toBe(false);
      expect(presentation.fallbackRequired).toBe(true);
      expect(listProgrammeTemplates({ participantCount: count })).toHaveLength(0);
    }
  });

  it("counts above 16 remain valid for fallback path (no product maximum)", () => {
    for (const count of [17, 24, 32]) {
      const presentation = buildPlanungProgrammeTemplatePresentation({
        participantCount: count,
        categoryContext: "E_FF12",
      });
      expect(presentation.available).toBe(false);
      expect(presentation.fallbackRequired).toBe(true);
    }
  });
});
