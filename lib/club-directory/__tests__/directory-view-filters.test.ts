import { describe, expect, it } from "vitest";
import {
  applyClubDirectoryViewFilters,
  parseClubDirectoryProviderFilter,
  parseClubDirectoryTeamsFilter,
} from "../directory-view-filters";
import type { ClubDirectoryListItem } from "../directory-view-filters";

function club(overrides: Partial<ClubDirectoryListItem> = {}): ClubDirectoryListItem {
  return {
    id: "c1",
    name: "Test FC",
    shortName: null,
    alternativeName: null,
    logoUrl: null,
    source: "MANUAL",
    archivedAt: null,
    teamCount: 0,
    hasProviderMapping: false,
    ...overrides,
  };
}

describe("directory-view-filters", () => {
  it("parses provider and teams URL values", () => {
    expect(parseClubDirectoryProviderFilter("linked")).toBe("linked");
    expect(parseClubDirectoryProviderFilter("nope")).toBe("all");
    expect(parseClubDirectoryTeamsFilter("without")).toBe("without");
  });

  it("filters by provider linkage and team presence", () => {
    const rows = [
      club({ id: "a", hasProviderMapping: true, teamCount: 2 }),
      club({ id: "b", hasProviderMapping: false, teamCount: 0 }),
      club({ id: "c", hasProviderMapping: false, teamCount: 1 }),
    ];
    expect(applyClubDirectoryViewFilters(rows, "linked", "all").map((r) => r.id)).toEqual(["a"]);
    expect(applyClubDirectoryViewFilters(rows, "manual", "all").map((r) => r.id)).toEqual(["b", "c"]);
    expect(applyClubDirectoryViewFilters(rows, "all", "with").map((r) => r.id)).toEqual(["a", "c"]);
    expect(applyClubDirectoryViewFilters(rows, "all", "without").map((r) => r.id)).toEqual(["b"]);
  });
});
