import type { MatchcenterVisibility } from "@/lib/matchcenter/types";

/** Test/fixture default mirroring typical HOME match publication flags — not used in production mapping. */
export function weekplannerMatchPublicationVisibilityFixture(
  overrides: Partial<MatchcenterVisibility> = {},
): MatchcenterVisibility {
  return {
    websiteVisible: false,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: true,
    trainingsplanVisible: false,
    teamPageVisible: false,
    ...overrides,
  };
}
