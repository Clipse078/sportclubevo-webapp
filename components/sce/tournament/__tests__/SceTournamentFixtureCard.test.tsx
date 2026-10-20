/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCard from "../SceTournamentFixtureCard";
import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import { expectCanonicalStackedFixtureIdentity } from "./fixture-identity-order-assertions";

const participants = [
  { participantId: "a", displayName: "Alpha FC", crestUrl: "https://example.com/a.png" },
  { participantId: "b", displayName: "Beta United", crestUrl: null },
];

const fixture: TournamentSpielplanFixturePresentation = {
  fixtureId: "f1",
  sideALabel: "Alpha FC",
  sideBLabel: "Beta United",
  sideAParticipantId: "a",
  sideBParticipantId: "b",
  sideAIsPlaceholder: false,
  sideBIsPlaceholder: false,
  pairingLabel: "Alpha FC – Beta United",
  startUtc: "2026-08-01T08:00:00.000Z",
  endUtc: "2026-08-01T08:14:00.000Z",
  pitchId: "p1",
  pitchLabel: "Feld 1",
  roundTitle: "Runde 1",
  result: null,
};

describe("SceTournamentFixtureCard", () => {
  it("renders pitch, participants, and VS via canonical stacked identity", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    const card = screen.getByTestId("sce-tournament-fixture-card-f1");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
    expect(screen.getByText("Alpha FC")).toBeInTheDocument();
    expect(screen.getByText("Beta United")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-vs")).toHaveTextContent("VS");
    expectCanonicalStackedFixtureIdentity(card);
  });

  it("renders authoritative crest without circular avatar wrapper on real logo", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    const image = screen.getByTestId("club-crest-image");
    expect(image).toBeInTheDocument();
    expect(image.className).toContain("object-contain");
    expect(image.closest('[data-testid="club-crest-bounds"]')).toBeInTheDocument();
    expect(image.closest(".rounded-full")).toBeNull();
  });

  it("uses fallback when crest is missing", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("club-crest-fallback-initials")).toBeInTheDocument();
  });

  it("does not show fake 0:0 for unplayed fixtures", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.queryByText("0:0")).not.toBeInTheDocument();
  });

  it("shows completed result when present", () => {
    render(
      <SceTournamentFixtureCard
        fixture={{
          ...fixture,
          result: { scoreSideA: 2, scoreSideB: 1 },
        }}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByText("2:1")).toBeInTheDocument();
  });

  it("does not force single-line truncate on long participant names", () => {
    render(
      <SceTournamentFixtureCard
        fixture={{
          ...fixture,
          sideALabel: "FC Allschwil Junioren F1",
          sideBLabel: "FC Allschwil Junioren F2",
        }}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    const card = screen.getByTestId("sce-tournament-fixture-card-f1");
    expect(card.textContent).toContain("FC Allschwil Junioren F1");
    expect(card.textContent).toContain("FC Allschwil Junioren F2");
  });

  it("centers matchup cluster so crests frame VS", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("sce-tournament-fixture-matchup-cluster")).toBeInTheDocument();
  });

  it("omits per-fixture time when showFixtureTime is false", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
        showFixtureTime={false}
      />,
    );
    expect(screen.queryByTestId("sce-tournament-fixture-time")).not.toBeInTheDocument();
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
  });

  it("keeps time before pitch metadata when showFixtureTime is true", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
        showFixtureTime
      />,
    );
    expect(screen.getByTestId("sce-tournament-fixture-time")).toBeInTheDocument();
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
  });

  it("de-emphasises non-highlighted fixtures when highlight is active", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        highlightParticipantId="a"
        timezone="Europe/Zurich"
      />,
    );
    const card = screen.getByTestId("sce-tournament-fixture-card-f1");
    expect(card.className).toMatch(/border-\[var\(--sce-primary\)\]/);
  });
});
