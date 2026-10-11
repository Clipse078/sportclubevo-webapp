/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    externalRelease: null,
    ...overrides,
  };
}

function squadPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: "v1",
    editable: true,
    canEdit: true,
    readOnlyReason: null,
    teamId: "team-b1",
    teamSeasonId: "ts-b1",
    canManageRelease: true,
    releaseReadOnly: false,
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

  it("sorts remaining players by availability presentation order (UAT B1 regression)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify(
          squadPayload({
            remaining: [
              player({
                personId: "p02",
                displayName: "SCE Testspieler 02",
                sortOrder: 2,
                shirtNumber: 2,
                presentationStatus: "UNAVAILABLE",
                availability: "UNAVAILABLE",
                availabilityLabel: "Nicht verfügbar",
                participationStatus: "NO",
              }),
              player({
                personId: "p03",
                displayName: "SCE Testspieler 03",
                sortOrder: 3,
                shirtNumber: 3,
                presentationStatus: "UNAVAILABLE",
                availability: "UNAVAILABLE",
                availabilityLabel: "Nicht verfügbar",
                participationStatus: "NO",
              }),
              player({
                personId: "p05",
                displayName: "SCE Testspieler 05",
                sortOrder: 5,
                shirtNumber: 5,
                canSelect: true,
                availability: "UNKNOWN",
                availabilityLabel: "Offen",
                presentationStatus: "OPEN",
                presentationTone: "muted",
                presentationIcon: "circle",
                participationStatus: null,
              }),
            ],
            counts: {
              rosterTotal: 3,
              available: 0,
              unavailable: 2,
              maybe: 0,
              open: 1,
              selected: 0,
              selectedAvailable: 0,
              selectedMaybe: 0,
              selectedOpen: 0,
              conflicts: 0,
            },
          }),
        ),
    });

    render(<MatchSquadSection matchId="match-1" />);

    const list = await screen.findByTestId("match-squad-remaining-list");
    const names = Array.from(list.querySelectorAll("[data-testid^='match-squad-player-name-']")).map(
      (el) => el.textContent?.trim(),
    );
    expect(names).toEqual([
      "SCE Testspieler 05",
      "SCE Testspieler 02",
      "SCE Testspieler 03",
    ]);
  });

  it("does not move removed external assignments into Weitere Kaderspieler (01E-R2)", async () => {
    const externalSelected = player({
      personId: "p-ext",
      displayName: "SCE Testspieler 01",
      rosterEligible: false,
      rosterIneligibleLabel: "FC Allschwil Junioren B1 · freigegeben",
      selected: true,
      canRemove: true,
      externalRelease: {
        sourceTeamSeasonId: "ts-b1",
        sourceTeamLabel: "FC Allschwil Junioren B1",
        playerReleaseRequestId: "req-1",
        releaseRevoked: false,
        releaseRevokedLabel: null,
      },
    });
    const approvedCandidate = {
      requestId: "req-1",
      personId: "p-ext",
      personDisplayName: "SCE Testspieler 01",
      sourceTeamSeasonId: "ts-b1",
      sourceTeamLabel: "FC Allschwil Junioren B1",
      statusLabel: "Genehmigt",
      availabilityLabel: "Offen",
      availabilityTone: "muted" as const,
      conflictHints: [],
      canAssign: true,
      assignBlockedReason: null,
      assignWarning: null,
      version: "v1",
    };

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify(
              squadPayload({
                teamSeasonId: "ts-b2",
                teamDisplayName: "Junioren B2",
                selected: [externalSelected],
                remaining: [],
                approvedReleaseCandidates: [],
                counts: {
                  rosterTotal: 0,
                  available: 0,
                  unavailable: 0,
                  maybe: 0,
                  open: 0,
                  selected: 1,
                  selectedAvailable: 0,
                  selectedMaybe: 0,
                  selectedOpen: 0,
                  conflicts: 0,
                },
              }),
            ),
        };
      }
      if (init.method === "PUT") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify(
              squadPayload({
                teamSeasonId: "ts-b2",
                teamDisplayName: "Junioren B2",
                version: "v2",
                selected: [],
                remaining: [],
                approvedReleaseCandidates: [approvedCandidate],
                counts: {
                  rosterTotal: 0,
                  available: 0,
                  unavailable: 0,
                  maybe: 0,
                  open: 0,
                  selected: 0,
                  selectedAvailable: 0,
                  selectedMaybe: 0,
                  selectedOpen: 0,
                  conflicts: 0,
                },
              }),
            ),
        };
      }
      throw new Error(`Unexpected fetch ${url} ${init?.method}`);
    });

    render(<MatchSquadSection matchId="match-b2" />);
    await screen.findByTestId("match-squad-remove-p-ext");

    await userEvent.click(screen.getByTestId("match-squad-remove-p-ext"));

    await waitFor(() => {
      expect(screen.queryByTestId("match-squad-player-p-ext")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Genehmigte Freigaben · 1/)).toBeInTheDocument();
    expect(screen.getByText("SCE Testspieler 01")).toBeInTheDocument();
  });

  it("keeps Freigeben on structural players after squad save when PUT omits release flags (01E-R1)", async () => {
    const remainingPlayer = player({
      personId: "p-open",
      displayName: "SCE Testspieler 05",
      canSelect: true,
      availability: "UNKNOWN",
      availabilityLabel: "Offen",
      presentationStatus: "OPEN",
      presentationTone: "muted",
      presentationIcon: "circle",
      participationStatus: null,
    });
    const selectedPlayer = player({
      personId: "p-selected",
      displayName: "SCE Testspieler 01",
      selected: true,
      canRemove: true,
      availability: "AVAILABLE",
      availabilityLabel: "Verfügbar",
      presentationStatus: "AVAILABLE",
      presentationTone: "success",
      presentationIcon: "check",
      participationStatus: "YES",
    });

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify(
              squadPayload({
                remaining: [remainingPlayer],
                selected: [selectedPlayer],
              }),
            ),
        };
      }
      if (init.method === "PUT") {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              version: "v2",
              editable: true,
              canEdit: true,
              readOnlyReason: null,
              teamId: "team-b1",
              teamSeasonId: "ts-b1",
              teamDisplayName: "Junioren B1",
              selected: [remainingPlayer, selectedPlayer],
              remaining: [],
              counts: squadPayload().counts,
            }),
        };
      }
      throw new Error(`Unexpected fetch ${url} ${init?.method}`);
    });

    render(<MatchSquadSection matchId="match-1" />);
    await screen.findByTestId("match-squad-release-p-open");
    expect(screen.getByTestId("match-squad-release-p-selected")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("match-squad-add-p-open"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/match-squad"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    expect(await screen.findByTestId("match-squad-release-p-open")).toBeInTheDocument();
    expect(screen.getByTestId("match-squad-release-p-selected")).toBeInTheDocument();
  });

});
