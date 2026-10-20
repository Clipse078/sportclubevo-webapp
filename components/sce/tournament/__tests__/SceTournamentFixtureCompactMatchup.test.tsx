/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCompactMatchup from "../SceTournamentFixtureCompactMatchup";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { expectCanonicalStackedFixtureIdentity } from "./fixture-identity-order-assertions";

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
  it("renders both participants and VS (inline alias → stacked spielplan)", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="inline" />);
    expect(screen.getByTestId("sce-tournament-fixture-compact-matchup")).toHaveAttribute(
      "data-layout",
      "inline",
    );
    expect(screen.getByText("FC Allschwil Junioren F1")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil Junioren F2")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-vs")).toHaveTextContent("VS");
    expectCanonicalStackedFixtureIdentity(
      screen.getByTestId("sce-tournament-fixture-compact-matchup"),
    );
  });

  it("renders crest image when available", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="stack" />);
    expect(screen.getByTestId("club-crest-image")).toBeInTheDocument();
    expect(screen.getByTestId("club-crest-fallback-initials")).toBeInTheDocument();
  });

  it("stack layout aliases to canonical stacked spielplan identity", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="stack" />);
    expectCanonicalStackedFixtureIdentity(
      screen.getByTestId("sce-tournament-fixture-compact-matchup"),
    );
  });

  it("spielplan is the default layout", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} />);
    expect(screen.getByTestId("sce-tournament-fixture-compact-matchup")).toHaveAttribute(
      "data-layout",
      "spielplan",
    );
  });

  it("spielplan layout uses canonical stacked identity", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="spielplan" />);
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    expect(matchup).toHaveAttribute("data-layout", "spielplan");
    expect(matchup).toHaveAttribute("data-crest-variant", "canonicalSpielplan");
    expectCanonicalStackedFixtureIdentity(matchup);
  });

  it("board layout uses canonical stacked match identity for Feld- und Zeitplan cells", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="board" />);
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    expect(matchup).toHaveAttribute("data-layout", "board");
    expect(matchup).toHaveAttribute("data-crest-variant", "canonicalStacked");
    expectCanonicalStackedFixtureIdentity(matchup);
    expect(screen.getByTestId("club-crest-image")).toBeInTheDocument();
  });
});
