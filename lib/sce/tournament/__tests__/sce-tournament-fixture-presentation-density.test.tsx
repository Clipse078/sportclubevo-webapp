/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCompactMatchup from "@/components/sce/tournament/SceTournamentFixtureCompactMatchup";
import SceTournamentFixturePresentation from "@/components/sce/tournament/SceTournamentFixturePresentation";
import {
  crestVisualSizeOverrideForFixturePresentation,
  matchIdentityDensityForFixturePresentation,
} from "../sce-tournament-fixture-presentation-density";

describe("SCE-TOURNAMENT-PLANNER-02E R2 — fixture presentation density", () => {
  it("maps composer, master, and grid to expected identity tiers", () => {
    expect(matchIdentityDensityForFixturePresentation("standard")).toBe("STANDARD");
    expect(matchIdentityDensityForFixturePresentation("compact")).toBe("COMPACT");
    expect(matchIdentityDensityForFixturePresentation("grid")).toBe("COMPACT");
  });

  it("uses board crest tier for grid — between compact and management", () => {
    expect(crestVisualSizeOverrideForFixturePresentation("standard")).toBe("planner");
    expect(crestVisualSizeOverrideForFixturePresentation("compact")).toBe("management");
    expect(crestVisualSizeOverrideForFixturePresentation("grid")).toBe("board");
  });

  it("grid board layout renders board crest bounds and clamped names", () => {
    render(
      <SceTournamentFixtureCompactMatchup
        layout="board"
        presentationDensity="grid"
        sideA={{
          label: "FC Allschwil Junioren F1 with a very long descriptive suffix",
          crestUrl: "https://example.com/a.png",
          isPlaceholder: false,
          participantId: "a",
          qualificationProvenanceLabel: null,
        }}
        sideB={{
          label: "Guest Club B",
          crestUrl: null,
          isPlaceholder: false,
          participantId: "b",
          qualificationProvenanceLabel: null,
        }}
      />,
    );
    const bounds = screen.getByTestId("club-crest-bounds");
    expect(bounds.className).toMatch(/h-9/);
    const homeName = screen.getByText(/FC Allschwil Junioren F1/);
    expect(homeName.className).toMatch(/line-clamp-2/);
    expect(screen.getByTestId("sce-match-vs")).toHaveAttribute(
      "data-sce-tournament-fixture-vs-density",
      "grid",
    );
  });

  it("grid presentation omits matrix-owned field and time labels", () => {
    render(
      <SceTournamentFixturePresentation
        density="grid"
        embedded
        sideA={{
          label: "A",
          crestUrl: null,
          isPlaceholder: false,
          participantId: "a",
          qualificationProvenanceLabel: null,
        }}
        sideB={{
          label: "B",
          crestUrl: null,
          isPlaceholder: false,
          participantId: "b",
          qualificationProvenanceLabel: null,
        }}
        pitchLabel="Feld 1"
        timeLabel="09:00"
        testId="grid-fixture"
      />,
    );
    expect(screen.queryByTestId("sce-tournament-spielplan-fixture-field")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-tournament-fixture-time")).not.toBeInTheDocument();
  });
});
