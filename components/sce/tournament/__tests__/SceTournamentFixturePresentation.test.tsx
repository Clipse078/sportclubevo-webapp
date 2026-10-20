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
