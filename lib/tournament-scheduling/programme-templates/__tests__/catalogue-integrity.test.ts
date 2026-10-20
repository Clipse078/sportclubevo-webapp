import { describe, expect, it } from "vitest";
import { E_FF12_ROTATION_TEMPLATES } from "../catalogue/e-ff12-rotation";
import { validateProgrammeTemplateIntegrity } from "../template-integrity";
import { curatedTemplateParticipantCounts } from "../template-registry";

describe("programme template catalogue integrity", () => {
  it("covers curated counts 4–8 with no integrity issues", () => {
    expect(curatedTemplateParticipantCounts()).toEqual([4, 5, 6, 7, 8]);
    for (const template of E_FF12_ROTATION_TEMPLATES) {
      const issues = validateProgrammeTemplateIntegrity(template);
      expect(issues, `${template.id} integrity`).toEqual([]);
    }
  });
});
