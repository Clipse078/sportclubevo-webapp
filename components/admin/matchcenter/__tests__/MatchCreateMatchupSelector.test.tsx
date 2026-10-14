/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchCreateMatchupSelector } from "../MatchCreateMatchupSelector";
import { buildMatchCreatePreviewClubPair } from "@/lib/matchcenter/composer/build-match-create-preview-pair";

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

const pair = buildMatchCreatePreviewClubPair({
  tenantClubName: "FC Allschwil",
  tenantLogoUrl: null,
  tenantTeamName: "",
  homeAway: "HOME",
  opponentClubName: "Gegner",
  opponentTeamName: "",
  opponentExternalClubId: null,
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/club-directory/clubs")) {
        return jsonResponse({
          clubs: [{ id: "club-1", name: "BSC Old Boys", shortName: null, logoUrl: null }],
          meta: { total: 1, limit: 200, skip: 0, hasMore: false },
        });
      }
      if (url.includes("/api/clubs/selectable/") && url.endsWith("/teams")) {
        return jsonResponse({ teams: [{ id: "et-1", clubId: "club-1", name: "B1", shortName: null, categoryLabel: null }] });
      }
      throw new Error(url);
    }),
  );
});

describe("MatchCreateMatchupSelector — canonical selector", () => {
  it("selecting a club completes opponent selection without team drilldown", async () => {
    const onSelectExternalClub = vi.fn();
    const onOpponentDisplayNameChange = vi.fn();

    render(
      <MatchCreateMatchupSelector
        pair={pair}
        homeAway="HOME"
        onHomeAwayChange={() => {}}
        teamOptions={[{ id: "team-1", name: "1. Mannschaft", ageGroup: null, genderGroup: null }]}
        teamId=""
        onTeamIdChange={() => {}}
        formatTeamLabel={(t) => t.name}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        selectedExternalClub={null}
        onSelectExternalClub={onSelectExternalClub}
        onClearExternalClub={() => {}}
        opponentDisplayName=""
        onOpponentDisplayNameChange={onOpponentDisplayNameChange}
      />,
    );

    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    await waitFor(() => {
      expect(screen.getByTestId("match-create-opponent-selector-grid")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("sce-club-card-club-1"));

    await waitFor(() => {
      expect(onSelectExternalClub).toHaveBeenCalledWith(
        expect.objectContaining({ id: "club-1", name: "BSC Old Boys" }),
      );
    });
    expect(onOpponentDisplayNameChange).toHaveBeenCalledWith("BSC Old Boys");
    expect(screen.queryByTestId("match-create-opponent-selector-manual-team-input")).toBeNull();
    expect(screen.queryByTestId("match-create-opponent-selector-back-to-clubs")).toBeNull();
  });

  it("opens opponent selector with clubs visible before typing", async () => {
    render(
      <MatchCreateMatchupSelector
        pair={pair}
        homeAway="HOME"
        onHomeAwayChange={() => {}}
        teamOptions={[{ id: "team-1", name: "1. Mannschaft", ageGroup: null, genderGroup: null }]}
        teamId=""
        onTeamIdChange={() => {}}
        formatTeamLabel={(t) => t.name}
        tenantClubName="FC Allschwil"
        tenantLogoUrl={null}
        selectedExternalClub={null}
        onSelectExternalClub={() => {}}
        onClearExternalClub={() => {}}
        opponentDisplayName=""
        onOpponentDisplayNameChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId("match-create-change-opponent-away"));
    await waitFor(() => {
      expect(screen.getByTestId("match-create-opponent-selector-grid")).toBeTruthy();
    });
    expect(screen.getByText("BSC Old Boys")).toBeTruthy();
  });
});
