/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClubDirectorySearchableList from "../ClubDirectorySearchableList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
import { CLUB_DIRECTORY_MAX_LIMIT } from "@/lib/club-directory/query-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

function clubsApiResponse(clubs: unknown[], meta: { total: number; skip: number; hasMore: boolean }) {
  return {
    ok: true,
    json: async () => ({
      clubs,
      meta: { ...meta, limit: CLUB_DIRECTORY_MAX_LIMIT, maxLimit: CLUB_DIRECTORY_MAX_LIMIT },
    }),
  };
}

describe("ClubDirectorySearchableList — provider filter", () => {
  it("shows only manual clubs when provider=manual", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url, "http://localhost");
      const archivedOnly = parsed.searchParams.get("archivedOnly") === "true";
      if (archivedOnly) {
        return clubsApiResponse([], { total: 0, skip: 0, hasMore: false });
      }
      return clubsApiResponse(
        [
          {
            id: "linked",
            name: "Linked FC",
            shortName: null,
            alternativeName: null,
            logoUrl: null,
            source: "PROVIDER",
            archivedAt: null,
            teamCount: 1,
            hasProviderMapping: true,
          },
          {
            id: "manual",
            name: "Manual FC",
            shortName: null,
            alternativeName: null,
            logoUrl: null,
            source: "MANUAL",
            archivedAt: null,
            teamCount: 0,
            hasProviderMapping: false,
          },
        ],
        { total: 2, skip: 0, hasMore: false },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubDirectorySearchableList providerFilter="manual" teamsFilter="all" />);

    await waitFor(() => {
      expect(screen.getByTestId("vereine-club-row-manual")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("vereine-club-row-linked")).not.toBeInTheDocument();
  });
});
