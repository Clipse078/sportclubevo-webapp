/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCompactMatchup from "../SceTournamentFixtureCompactMatchup";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

const sideA: TournamentPlanungFixtureSidePresentation = {
  label: "FC Allschwil Junioren F1",
  crestUrl: "https://example.com/a.png",
  isPlaceholder: false,
  participantId: "a",
  qualificationProvenanceLabel: null,
};

const sideB: TournamentPlanungFixtureSidePresentation = {
  label: "FC Allschwil Junioren F2",
  crestUrl: null,
  isPlaceholder: false,
  participantId: "b",
  qualificationProvenanceLabel: null,
};

describe("SceTournamentFixtureCompactMatchup", () => {
  it("renders both participants and VS (inline)", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="inline" />);
    expect(screen.getByTestId("sce-tournament-fixture-compact-matchup")).toHaveAttribute(
      "data-layout",
      "inline",
    );
    expect(screen.getByText("FC Allschwil Junioren F1")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil Junioren F2")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
  });

  it("renders crest image when available", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="stack" />);
    expect(screen.getByTestId("club-crest-image")).toBeInTheDocument();
    expect(screen.getByTestId("club-crest-fallback-initials")).toBeInTheDocument();
  });

  it("stack layout is used for board cells", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} />);
    expect(screen.getByTestId("sce-tournament-fixture-compact-matchup")).toHaveAttribute(
      "data-layout",
      "stack",
    );
  });
});
