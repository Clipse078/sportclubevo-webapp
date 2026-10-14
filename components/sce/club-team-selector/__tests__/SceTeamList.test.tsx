/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceTeamList } from "../SceTeamList";

describe("SceTeamList", () => {
  it("formats team metadata without duplicate tokens", () => {
    render(
      <SceTeamList
        teams={[
          {
            id: "t1",
            clubId: "c1",
            name: "FC Allschwil 1. Mannschaft",
            shortName: null,
            categoryLabel: "Aktive / Men",
            ageGroup: "Aktive",
            genderGroup: "Men",
          },
        ]}
        onSelectTeam={() => {}}
      />,
    );
    const row = screen.getByTestId("sce-team-row-t1");
    expect(row.getAttribute("data-sce-team-meta")).toBe("Aktive · Herren");
    expect(screen.getByText("Aktive · Herren")).toBeTruthy();
  });
});
