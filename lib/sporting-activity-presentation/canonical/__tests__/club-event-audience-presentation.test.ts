import { describe, expect, it } from "vitest";
import {
  formatSceClubEventAudienceCompactLabel,
  formatSceClubEventAudiencePrimaryLabel,
} from "../club-event-audience-presentation";

describe("club-event audience presentation", () => {
  it("formats primary and compact team-count labels without inventing names", () => {
    const audience = {
      scope: "SELECTED_ORG_UNITS" as const,
      primaryLabel: "Junioren F1 · Junioren F2",
      detailLabels: ["Junioren F1", "Junioren F2"],
      targetCount: 2,
      teamCount: 2,
    };
    expect(formatSceClubEventAudiencePrimaryLabel(audience)).toBe("Junioren F1 · Junioren F2");
    expect(formatSceClubEventAudienceCompactLabel(audience)).toBe("2 Teams");
    expect(
      formatSceClubEventAudienceCompactLabel({
        ...audience,
        compactLabel: "2 Teams",
      }),
    ).toBe("2 Teams");
  });
});
