/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SceClubTeamSelectorDialog } from "../SceClubTeamSelectorDialog";

const CLUBS = [
  {
    id: "club-1",
    name: "BSC Old Boys",
    shortName: null,
    alternativeName: null,
    logoUrl: null,
    status: "active" as const,
    teamCount: 1,
  },
];

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SceClubTeamSelectorDialog", () => {
  it("shows clubs immediately on open before typing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/club-directory/clubs")) {
          return jsonResponse({ clubs: CLUBS, meta: { total: 1, limit: 200, skip: 0, hasMore: false } });
        }
        throw new Error(url);
      }),
    );

    render(
      <SceClubTeamSelectorDialog
        open
        onOpenChange={() => {}}
        mode="CLUB_ONLY"
        onConfirm={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sce-club-team-selector-grid")).toBeTruthy();
    });
    expect(screen.getByText("BSC Old Boys")).toBeTruthy();
  });

  it("filters visible clubs when search changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/club-directory/clubs")) {
          return jsonResponse({
            clubs: [
              ...CLUBS,
              {
                id: "club-2",
                name: "FC Basel",
                shortName: null,
                alternativeName: null,
                logoUrl: null,
                status: "active",
                teamCount: 0,
              },
            ],
            meta: { total: 2, limit: 200, skip: 0, hasMore: false },
          });
        }
        throw new Error(url);
      }),
    );

    render(
      <SceClubTeamSelectorDialog
        open
        onOpenChange={() => {}}
        mode="CLUB_ONLY"
        onConfirm={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByText("FC Basel")).toBeTruthy());
    fireEvent.change(screen.getByTestId("sce-club-team-selector-search"), {
      target: { value: "old" },
    });
    expect(screen.queryByText("FC Basel")).toBeNull();
    expect(screen.getByText("BSC Old Boys")).toBeTruthy();
  });
});
