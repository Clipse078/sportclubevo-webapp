import { describe, expect, it } from "vitest";
import {
  buildRequirementAssignedCopy,
  buildRequirementCancelledCopy,
  buildRequirementOverdueCopy,
  buildRequirementReminderCopy,
} from "../requirement-copy";

describe("requirement notification copy", () => {
  it("N34/N35 — guardian vs self assigned copy", () => {
    const guardian = buildRequirementAssignedCopy({
      requirementTitle: "Verhaltenskodex",
      subjectDisplayName: "James",
      notifyAsGuardian: true,
    });
    expect(guardian.title).toBe("James: Verhaltenskodex bestätigen");

    const self = buildRequirementAssignedCopy({
      requirementTitle: "Trainershandbuch 2026/27",
      notifyAsGuardian: false,
    });
    expect(self.title).toBe("Neue Anforderung: Trainershandbuch 2026/27 bestätigen");
  });

  it("N14 — copy does not expose internal domain terms", () => {
    const copy = buildRequirementReminderCopy({
      requirementTitle: "Handbuch",
      notifyAsGuardian: false,
      dueLabel: "Fr., 26. Sept. 2026, 18:00",
    });
    expect(copy.title).not.toMatch(/RequirementRecipient|ACKNOWLEDGE|responseMode/i);
    expect(copy.body).not.toMatch(/RequirementRecipient|ACKNOWLEDGE|responseMode/i);
  });

  it("overdue and cancelled operational language", () => {
    expect(
      buildRequirementOverdueCopy({
        requirementTitle: "Handbuch",
        notifyAsGuardian: false,
      }).title,
    ).toMatch(/^Überfällig:/);

    expect(
      buildRequirementCancelledCopy({
        requirementTitle: "Handbuch",
        notifyAsGuardian: false,
      }).title,
    ).toMatch(/^Anforderung aufgehoben:/);
  });
});
