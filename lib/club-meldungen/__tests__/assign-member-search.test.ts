import { describe, expect, it } from "vitest";
import {
  filterClubMeldungAssignMembersBySearch,
  listInitialClubMeldungAssignMembers,
} from "@/lib/club-meldungen/assign-member-search";

const members = [
  { id: "1", firstName: "Patrick", lastName: "Admin", canOperateCase: true },
  { id: "2", firstName: "Sandra", lastName: "Team", canOperateCase: false },
];

describe("filterClubMeldungAssignMembersBySearch", () => {
  it("returns sorted initial slice for empty query", () => {
    expect(listInitialClubMeldungAssignMembers(members)).toEqual([members[0], members[1]]);
    expect(filterClubMeldungAssignMembersBySearch(members, "")).toEqual([members[0], members[1]]);
  });

  it("matches display name with partial query", () => {
    expect(filterClubMeldungAssignMembersBySearch(members, "pat")).toEqual([members[0]]);
    expect(filterClubMeldungAssignMembersBySearch(members, "p")).toEqual([members[0]]);
  });

  it("returns empty when filter excludes everyone", () => {
    expect(filterClubMeldungAssignMembersBySearch(members, "zz")).toEqual([]);
  });
});