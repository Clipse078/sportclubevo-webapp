/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TournamentExternalClubsSection from "../TournamentExternalClubsSection";

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TournamentExternalClubsSection", () => {
  it("opens elevated CLUB_ONLY selector above composer tree (no popover)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/club-directory/clubs")) {
          return jsonResponse({
            clubs: [
              {
                id: "club-basel",
                name: "FC Basel",
                shortName: null,
                alternativeName: null,
                logoUrl: null,
                status: "active",
                teamCount: 0,
              },
            ],
            meta: { total: 1, limit: 200, skip: 0, hasMore: false },
          });
        }
        throw new Error(url);
      }),
    );

    const onAdd = vi.fn();
    render(
      <TournamentExternalClubsSection identities={[]} onAddExternalClub={onAdd} onRemoveParticipant={() => {}} />,
    );

    fireEvent.click(screen.getByTestId("tournament-external-club-add"));

    await waitFor(() => {
      expect(screen.getByTestId("tournament-participant-club-selector")).toBeInTheDocument();
    });
    expect(document.querySelector('[data-stack-layer="elevated"]')).toBeTruthy();
  });
});
