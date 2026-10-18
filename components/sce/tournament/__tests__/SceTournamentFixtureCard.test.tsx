/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentFixtureCard from "../SceTournamentFixtureCard";
import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import { expectCanonicalFixtureIdentityOrder } from "./fixture-identity-order-assertions";

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
  it("renders time, pitch, participants, and VS", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("sce-tournament-fixture-card-f1")).toBeInTheDocument();
    expect(screen.getByText("Feld 1")).toBeInTheDocument();
    expect(screen.getByText("Alpha FC")).toBeInTheDocument();
    expect(screen.getByText("Beta United")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
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
    const nameSpans = card.querySelectorAll("span[title]");
    for (const span of nameSpans) {
      expect(span.className).not.toContain("truncate");
    }
  });

  it("standard density keeps Spielplan compact crest scale (not planung management)", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
        density="standard"
      />,
    );
    const crests = screen
      .getByTestId("sce-tournament-fixture-matchup")
      .querySelectorAll('[data-fixture-crest-size="compact"]');
    expect(crests.length).toBe(2);
    expect(
      screen.getByTestId("sce-tournament-fixture-matchup").querySelector('[data-fixture-crest-size="management"]'),
    ).toBeNull();
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

  it("uses canonical DOM identity order (name → crest → VS → crest → name)", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    const matchup = screen.getByTestId("sce-tournament-fixture-matchup");
    expectCanonicalFixtureIdentityOrder(matchup);
  });

  it("keeps time and pitch before matchup identity", () => {
    render(
      <SceTournamentFixtureCard
        fixture={fixture}
        participants={participants}
        timezone="Europe/Zurich"
      />,
    );
    const card = screen.getByTestId("sce-tournament-fixture-card-f1");
    const pitch = screen.getByText("Feld 1");
    const firstName = card.querySelector('[data-fixture-identity-segment="name"]');
    expect(pitch.compareDocumentPosition(firstName!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
