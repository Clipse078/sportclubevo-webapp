/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCompactMatchup from "../SceTournamentFixtureCompactMatchup";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { expectCanonicalFixtureIdentityOrder } from "./fixture-identity-order-assertions";

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

  it("inline layout uses canonical identity order", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="inline" />);
    expectCanonicalFixtureIdentityOrder(
      screen.getByTestId("sce-tournament-fixture-compact-matchup"),
    );
  });

  it("stack layout uses canonical identity order", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="stack" />);
    expectCanonicalFixtureIdentityOrder(
      screen.getByTestId("sce-tournament-fixture-compact-matchup"),
    );
  });

  it("stack layout is used for board cells", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} />);
    expect(screen.getByTestId("sce-tournament-fixture-compact-matchup")).toHaveAttribute(
      "data-layout",
      "stack",
    );
  });

  it("inline planung uses larger management crest density", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="inline" />);
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    expect(matchup).toHaveAttribute("data-crest-variant", "planung");
    const crests = matchup.querySelectorAll('[data-fixture-crest-size="management"]');
    expect(crests.length).toBe(2);
  });

  it("stack board cells use planungBoard compact crest without micro icons", () => {
    render(<SceTournamentFixtureCompactMatchup sideA={sideA} sideB={sideB} layout="stack" />);
    const matchup = screen.getByTestId("sce-tournament-fixture-compact-matchup");
    expect(matchup).toHaveAttribute("data-crest-variant", "planungBoard");
    const crests = matchup.querySelectorAll('[data-fixture-crest-size="compact"]');
    expect(crests.length).toBe(2);
    expect(matchup.querySelector('[data-fixture-crest-size="micro"]')).toBeNull();
  });
});
