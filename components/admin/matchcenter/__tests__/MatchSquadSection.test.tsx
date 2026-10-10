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

describe("MatchSquadSection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows Nicht verfügbar action instead of disabled Aufbieten for unavailable remaining players", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
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
        }),
    });

    render(<MatchSquadSection matchId="match-1" />);

    expect(await screen.findByTestId("match-squad-unavailable-action-p1")).toHaveTextContent(
      "Nicht verfügbar",
    );
    expect(screen.queryByTestId("match-squad-add-p1")).not.toBeInTheDocument();
  });
});
