/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import SceTournamentFixturePresentation from "../SceTournamentFixturePresentation";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";
import { expectCanonicalStackedFixtureIdentity } from "./fixture-identity-order-assertions";

const side = (label: string): TournamentPlanungFixtureSidePresentation => ({
  label,
  crestUrl: null,
  isPlaceholder: false,
  participantId: label,
  qualificationProvenanceLabel: null,
});

describe("SCE-TOURNAMENT-PLANNER-02E — unified fixture presentation", () => {
  it("uses stacked match identity at standard, compact, and grid densities", () => {
    for (const density of ["standard", "compact", "grid"] as const) {
      const { unmount } = render(
        <SceTournamentFixturePresentation
          density={density}
          sideA={side("Team A")}
          sideB={side("Team B")}
          pitchLabel={density === "grid" ? null : "Feld 1"}
          testId={`fixture-${density}`}
        />,
      );
      expectCanonicalStackedFixtureIdentity(screen.getByTestId(`fixture-${density}`));
      unmount();
    }
  });

  it("uses canonical VS capsule from one primitive across densities", () => {
    for (const density of ["standard", "compact", "grid"] as const) {
      const { unmount } = render(
        <SceTournamentFixturePresentation
          density={density}
          sideA={side("Team A")}
          sideB={side("Team B")}
          testId={`fixture-vs-${density}`}
        />,
      );
      const vs = screen.getByTestId("sce-match-vs");
      expect(vs).toHaveTextContent("VS");
      expect(vs).toHaveAttribute("data-sce-tournament-fixture-vs-density", density);
      expect(vs).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("renders playing format only when playersPerSide is set", () => {
    const { rerender } = render(
      <SceTournamentFixturePresentation
        density="standard"
        sideA={side("A")}
        sideB={side("B")}
        playersPerSide={3}
        testId="fixture-format"
      />,
    );
    expect(screen.getByTestId("sce-tournament-spielplan-fixture-format")).toHaveTextContent("3v3");

    rerender(
      <SceTournamentFixturePresentation
        density="standard"
        sideA={side("A")}
        sideB={side("B")}
        playersPerSide={null}
        testId="fixture-format"
      />,
    );
    expect(screen.queryByTestId("sce-tournament-spielplan-fixture-format")).not.toBeInTheDocument();
  });

  it("grid density omits field and time metadata", () => {
    render(
      <SceTournamentFixturePresentation
        density="grid"
        sideA={side("A")}
        sideB={side("B")}
        pitchLabel="Feld 1"
        timeLabel="10:00"
        testId="fixture-grid-meta"
      />,
    );
    expect(screen.queryByTestId("sce-tournament-spielplan-fixture-field")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-tournament-fixture-time")).not.toBeInTheDocument();
  });

  it("compact matchup does not inline VS markup outside SceTournamentFixtureVs", () => {
    const matchupSource = readFileSync(
      join(process.cwd(), "components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx"),
      "utf8",
    );
    expect(matchupSource).toMatch(/SceTournamentFixtureVs/);
    expect(matchupSource).not.toMatch(/>\s*VS\s*</);
  });

  it("three Spielplan surfaces import the canonical presentation layer", () => {
    const root = process.cwd();
    const composer = readFileSync(
      join(root, "components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard.tsx"),
      "utf8",
    );
    const master = readFileSync(
      join(root, "components/sce/tournament/TournamentSpielplanMasterSchedule.tsx"),
      "utf8",
    );
    const board = readFileSync(
      join(root, "components/admin/tournamentcenter/planung/TournamentPlanungBoard.tsx"),
      "utf8",
    );
    const composerPresentation = readFileSync(
      join(root, "components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation.tsx"),
      "utf8",
    );

    expect(composer).toMatch(/SceTournamentFixturePresentation/);
    expect(composerPresentation).toMatch(/SceTournamentSpielplanPreviewFixtureCard/);
    expect(master).toMatch(/SceTournamentFixtureCard/);
    expect(board).toMatch(/SceTournamentFixturePresentation/);

    const fixtureCard = readFileSync(
      join(root, "components/sce/tournament/SceTournamentFixtureCard.tsx"),
      "utf8",
    );
    expect(fixtureCard).toMatch(/SceTournamentFixturePresentation/);
  });
});
