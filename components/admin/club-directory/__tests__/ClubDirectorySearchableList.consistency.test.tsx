/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClubDirectorySearchableList from "../ClubDirectorySearchableList";
import { CLUB_DIRECTORY_MAX_LIMIT } from "@/lib/club-directory/query-service";

const VFR_ID = "club-vfr-kleinhueningen";

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

describe("ClubDirectorySearchableList — canonical directory search", () => {
  it("server-side search finds VfR Kleinhüningen even when browse mode only loaded page 1", async () => {
    const page1 = Array.from({ length: CLUB_DIRECTORY_MAX_LIMIT }, (_, i) => ({
      id: `club-${i}`,
      name: `Alpha FC ${i}`,
      shortName: null,
      alternativeName: null,
      logoUrl: null,
      source: "PROVIDER",
      archivedAt: null,
      teamCount: 1,
      hasProviderMapping: true,
    }));

    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url, "http://localhost");
      const search = parsed.searchParams.get("search");
      const archivedOnly = parsed.searchParams.get("archivedOnly") === "true";

      if (archivedOnly) {
        return clubsApiResponse([], { total: 0, skip: 0, hasMore: false });
      }

      if (search?.toLowerCase().includes("klein")) {
        return clubsApiResponse(
          [
            {
              id: VFR_ID,
              name: "VfR Kleinhüningen",
              shortName: null,
              alternativeName: null,
              logoUrl: null,
              source: "PROVIDER",
              archivedAt: null,
              teamCount: 3,
              hasProviderMapping: true,
            },
          ],
          { total: 1, skip: 0, hasMore: false },
        );
      }

      const skip = Number(parsed.searchParams.get("skip") ?? "0");
      if (skip === 0) {
        return clubsApiResponse(page1, {
          total: CLUB_DIRECTORY_MAX_LIMIT + 5,
          skip: 0,
          hasMore: true,
        });
      }
      return clubsApiResponse([], { total: CLUB_DIRECTORY_MAX_LIMIT + 5, skip, hasMore: false });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ClubDirectorySearchableList />);

    await waitFor(() => expect(screen.getByTestId("vereine-directory-list")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("vereine-directory-search"), {
      target: { value: "Kleinhüningen" },
    });

    await waitFor(() => {
      expect(screen.getByTestId(`vereine-club-row-${VFR_ID}`)).toHaveTextContent("VfR Kleinhüningen");
    });

    const searchCalls = fetchMock.mock.calls.filter((call) => {
      const url = String(call[0]);
      return url.includes("search=Kleinh");
    });
    expect(searchCalls.length).toBeGreaterThan(0);
  });
});
