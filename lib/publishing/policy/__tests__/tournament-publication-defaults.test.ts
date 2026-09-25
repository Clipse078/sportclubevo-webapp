import { describe, expect, it } from "vitest";
import { resolveTournamentPublicationDefaultsForCreate } from "../tournament-publication-defaults";

describe("tournament-publication-defaults", () => {
  it("create defaults enable all five tournament publication channels", () => {
    expect(resolveTournamentPublicationDefaultsForCreate()).toEqual({
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    });
  });
});
