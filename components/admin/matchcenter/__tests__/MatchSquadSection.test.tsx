/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import MatchSquadSection from "../MatchSquadSection";

function player(
  overrides: Partial<MatchSquadPlayerPresentation> = {},
): MatchSquadPlayerPresentation {
  return {
    personId: "p1",
    displayName: "SCE Testspieler 03",
    shirtNumber: 3,
    sortOrder: 0,
    rosterEligible: true,
    rosterIneligibleLabel: null,
    rosterStatus: "ACTIVE",
    availability: "UNAVAILABLE",
    availabilityLabel: "Nicht verfügbar",
    presentationStatus: "UNAVAILABLE",
    presentationTone: "danger",
    presentationIcon: "x",
    participationStatus: "NO",
    participationNote: null,
    responseSource: null,
    responseProvenanceLabel: null,
    selected: false,
    availabilityConflict: false,
    staleRosterSelection: false,
    canSelect: false,
    canRemove: false,
    ...overrides,
  };
}

function squadPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: "v1",
    editable: true,
    canEdit: true,
    readOnlyReason: null,
    selected: [],
    remaining: [player()],
    teamDisplayName: "Junioren B1",
    counts: {
      rosterTotal: 1,
      available: 0,
      unavailable: 1,
      maybe: 0,
      open: 0,
      selected: 0,
      selectedAvailable: 0,
      selectedMaybe: 0,
      selectedOpen: 0,
      conflicts: 0,
    },
    ...overrides,
  };
}

describe("MatchSquadSection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("uses single-column player lists for selected and remaining sections", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(squadPayload()),
    });

    render(<MatchSquadSection matchId="match-1" />);

    const list = await screen.findByTestId("match-squad-remaining-list");
    expect(list).toHaveAttribute("data-layout", "single-column-rows");
    expect(list.className).not.toMatch(/grid-cols-2/);
  });

  it("does not show Aufbieten for unavailable remaining players", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(squadPayload()),
    });

    render(<MatchSquadSection matchId="match-1" />);

    await screen.findByTestId("match-squad-player-name-p1");
    expect(screen.queryByTestId("match-squad-add-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-squad-unavailable-action-p1")).not.toBeInTheDocument();
  });

  it("renders full display names in player rows", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify(
          squadPayload({
            remaining: [
              player({
                personId: "p-long",
                displayName: "SCE Testspieler 01",
                canSelect: true,
                availability: "UNKNOWN",
                availabilityLabel: "Offen",
                presentationStatus: "OPEN",
                presentationTone: "muted",
                presentationIcon: "circle",
                participationStatus: null,
              }),
            ],
          }),
        ),
    });

    render(<MatchSquadSection matchId="match-1" />);

    expect(await screen.findByTestId("match-squad-player-name-p-long")).toHaveTextContent(
      "SCE Testspieler 01",
    );
  });
});
