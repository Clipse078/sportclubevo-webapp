import { describe, expect, it } from "vitest";
import { formatSelectableTeamMetadata } from "../format-selectable-team-metadata";
import type { SceSelectableTeam } from "../types";

function team(partial: Partial<SceSelectableTeam> & Pick<SceSelectableTeam, "id" | "name">): SceSelectableTeam {
  return {
    clubId: "c1",
    shortName: null,
    categoryLabel: null,
    ageGroup: null,
    genderGroup: null,
    ...partial,
  };
}

describe("formatSelectableTeamMetadata", () => {
  it("removes duplicate category / age / gender tokens", () => {
    const meta = formatSelectableTeamMetadata(
      team({
        id: "t1",
        name: "FC Allschwil 1. Mannschaft",
        categoryLabel: "Aktive / Men",
        ageGroup: "Aktive",
        genderGroup: "Men",
      }),
    );
    expect(meta).toBe("Aktive · Herren");
  });

  it("preserves meaningful distinct metadata", () => {
    const meta = formatSelectableTeamMetadata(
      team({
        id: "t2",
        name: "FC Allschwil F2",
        categoryLabel: "Junioren F",
        genderGroup: "Mixed",
      }),
    );
    expect(meta).toBe("Junioren F · Mixed");
  });

  it("does not mutate team input", () => {
    const source = team({
      id: "t3",
      name: "Team",
      categoryLabel: "Aktive / Men",
      genderGroup: "Men",
    });
    const snapshot = { ...source };
    formatSelectableTeamMetadata(source);
    expect(source).toEqual(snapshot);
  });
});
