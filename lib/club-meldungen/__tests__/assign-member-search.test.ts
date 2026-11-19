import { describe, expect, it } from "vitest";
import { filterClubMeldungAssignMembersBySearch } from "@/lib/club-meldungen/assign-member-search";

const members = [
  { id: "1", firstName: "Patrick", lastName: "Admin", canOperateCase: true },
  { id: "2", firstName: "Sandra", lastName: "Team", canOperateCase: false },
];

describe("filterClubMeldungAssignMembersBySearch", () => {
  it("matches display name prefix after two characters", () => {
    expect(filterClubMeldungAssignMembersBySearch(members, "pat")).toEqual([members[0]]);
  });

  it("returns empty for short queries", () => {
    expect(filterClubMeldungAssignMembersBySearch(members, "p")).toEqual([]);
  });
});